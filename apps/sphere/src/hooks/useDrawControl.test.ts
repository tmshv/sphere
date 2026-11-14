import { DrawOpQueue } from "@/lib/draw-session"
import type { DrawEvent } from "@/types"
import { act, renderHook } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { afterEach, describe, expect, test, vi } from "vitest"
import { type DrawControlProps, useDrawControl } from "./useDrawControl"

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

// The draw control: only its identity matters here
vi.mock("@sphere/draw", () => ({
    default: class FakeDraw {
        constructor(readonly options: unknown) {}
    },
}))

// useControl builds the control once per mount, as react-map-gl does
vi.mock("react-map-gl/maplibre", async () => {
    const { useState } = await import("react")
    return {
        useControl: (factory: () => unknown) => useState(factory)[0],
    }
})

type Handler = (event: DrawEvent & { points?: GeoJSON.Feature[] }) => void

const EDIT_EVENTS = ["draw.create", "draw.update", "draw.delete", "draw.combine", "draw.uncombine"]

/** A map that records its `on` handlers and drops one when its subscription is cancelled. */
function makeMap() {
    const handlers = new Map<string, Set<Handler>>()
    const map = {
        on: vi.fn((type: string, handler: Handler) => {
            const set = handlers.get(type) ?? new Set<Handler>()
            set.add(handler)
            handlers.set(type, set)
            return { unsubscribe: () => set.delete(handler) }
        }),
    }
    const fire = (event: DrawEvent & { points?: GeoJSON.Feature[] }) => {
        act(() => {
            for (const handler of [...(handlers.get(event.type) ?? [])]) {
                handler(event)
            }
        })
    }
    const count = (type: string) => handlers.get(type)?.size ?? 0
    // The hook only calls `getMap().on`; a full MapRef is out of reach in a test
    const ref = { getMap: () => map } as unknown as MapRef
    return { ref, map, fire, count }
}

function makeQueue() {
    const queue = new DrawOpQueue("s1", () => {})
    const enqueueEvent = vi.spyOn(queue, "enqueueEvent").mockImplementation(() => {})
    return { queue, enqueueEvent }
}

function feature(id: number | string): GeoJSON.Feature {
    return { type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates: [0, 0] } }
}

function event(type: string): DrawEvent {
    return { type, features: [] }
}

function render(initial: DrawControlProps) {
    return renderHook((props: DrawControlProps) => useDrawControl(props), { initialProps: initial })
}

afterEach(() => {
    vi.clearAllMocks()
})

describe("useDrawControl", () => {
    test.each(EDIT_EVENTS)("%s reaches the op queue and onChange, with the draw control", type => {
        const { ref, fire } = makeMap()
        const { queue, enqueueEvent } = makeQueue()
        const onChange = vi.fn()
        const { result } = render({ ref, ops: queue, onChange })

        const sent = event(type)
        fire(sent)

        expect(enqueueEvent).toHaveBeenCalledExactlyOnceWith(sent)
        expect(onChange).toHaveBeenCalledExactlyOnceWith(sent, result.current)
    })

    test("forwards each edit event to the queue before onChange", () => {
        const { ref, fire } = makeMap()
        const { queue, enqueueEvent } = makeQueue()
        const order: string[] = []
        enqueueEvent.mockImplementation(() => order.push("queue"))
        render({ ref, ops: queue, onChange: () => order.push("onChange") })

        fire(event("draw.create"))

        expect(order).toEqual(["queue", "onChange"])
    })

    test("listens to the edit events only", () => {
        const { ref, map } = makeMap()
        const { queue } = makeQueue()

        render({ ref, ops: queue })

        expect(map.on.mock.calls.map(([type]) => type).sort()).toEqual([...EDIT_EVENTS].sort())
    })

    test("forwards the feature ids of a selection change, not its vertices", () => {
        const { ref, fire } = makeMap()
        const onSelectionChange = vi.fn()
        render({ ref, onSelectionChange })

        fire({
            type: "draw.selectionchange",
            features: [feature(4), feature("draw-a")],
            points: [feature("vertex")],
        })

        expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith([4, "draw-a"])
    })

    test("a selection change does not reach the op queue or onChange", () => {
        const { ref, fire } = makeMap()
        const { queue, enqueueEvent } = makeQueue()
        const onChange = vi.fn()
        render({ ref, ops: queue, onChange, onSelectionChange: vi.fn() })

        fire({ type: "draw.selectionchange", features: [feature(1)] })

        expect(enqueueEvent).not.toHaveBeenCalled()
        expect(onChange).not.toHaveBeenCalled()
    })

    test("stops forwarding selection changes on unmount", () => {
        const { ref, fire, count } = makeMap()
        const onSelectionChange = vi.fn()
        const { unmount } = render({ ref, onSelectionChange })

        unmount()
        fire({ type: "draw.selectionchange", features: [feature(1)] })

        expect(count("draw.selectionchange")).toBe(0)
        expect(onSelectionChange).not.toHaveBeenCalled()
    })

    test("still calls onChange without a queue", () => {
        const { ref, fire } = makeMap()
        const onChange = vi.fn()
        render({ ref, onChange })

        fire(event("draw.update"))

        expect(onChange).toHaveBeenCalledOnce()
    })

    test("subscribes to nothing without a map", () => {
        const { map } = makeMap()
        const { queue } = makeQueue()

        render({ ref: undefined, ops: queue })

        expect(map.on).not.toHaveBeenCalled()
    })

    test("unsubscribes every handler on unmount", () => {
        const { ref, fire, count } = makeMap()
        const { queue, enqueueEvent } = makeQueue()
        const { unmount } = render({ ref, ops: queue })

        unmount()
        for (const type of EDIT_EVENTS) {
            fire(event(type))
        }

        expect(EDIT_EVENTS.map(count)).toEqual([0, 0, 0, 0, 0])
        expect(enqueueEvent).not.toHaveBeenCalled()
    })

    test("a new queue replaces the old one without forwarding twice", () => {
        const { ref, fire, count } = makeMap()
        const first = makeQueue()
        const second = makeQueue()
        const { rerender } = render({ ref, ops: first.queue })

        rerender({ ref, ops: second.queue })
        fire(event("draw.delete"))

        expect(EDIT_EVENTS.map(count)).toEqual([1, 1, 1, 1, 1])
        expect(first.enqueueEvent).not.toHaveBeenCalled()
        expect(second.enqueueEvent).toHaveBeenCalledOnce()
    })

    test("keeps one subscription per event across re-renders with the same props", () => {
        const { ref, fire, count } = makeMap()
        const { queue, enqueueEvent } = makeQueue()
        const props = { ref, ops: queue }
        const { rerender } = render(props)

        rerender(props)
        rerender(props)
        fire(event("draw.combine"))

        expect(EDIT_EVENTS.map(count)).toEqual([1, 1, 1, 1, 1])
        expect(enqueueEvent).toHaveBeenCalledOnce()
    })
})

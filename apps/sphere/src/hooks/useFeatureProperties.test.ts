// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/store/hooks", () => ({
    useAppDispatch: vi.fn(),
}))

import { useAppDispatch } from "@/store/hooks"
import useFeatureProperties from "./useFeatureProperties"

function makeMockMap(queryResult: unknown[] = []) {
    const handlers: Map<string, { fn: (payload: object) => void; unsubscribe: ReturnType<typeof vi.fn> }[]> = new Map()
    return {
        on: vi.fn((event: string, fn: (payload: object) => void) => {
            const unsub = vi.fn()
            if (!handlers.has(event)) handlers.set(event, [])
            handlers.get(event)?.push({ fn, unsubscribe: unsub })
            return { unsubscribe: unsub }
        }),
        queryRenderedFeatures: vi.fn((_point: unknown, _opts: unknown) => queryResult),
        fire(event: string, payload: object = {}) {
            for (const h of handlers.get(event) ?? []) h.fn(payload)
        },
        getHandlers(event: string) {
            return handlers.get(event) ?? []
        },
    }
}

function makeRef(map: ReturnType<typeof makeMockMap>) {
    return { getMap: () => map } as unknown as MapRef
}

describe("useFeatureProperties (hover)", () => {
    let dispatch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        dispatch = vi.fn()
        vi.mocked(useAppDispatch).mockReturnValue(dispatch as unknown as ReturnType<typeof useAppDispatch>)
    })

    it("dispatches resetHover when layerIds is empty", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, [], 0))
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("resetHover") }))
        expect(map.on).not.toHaveBeenCalled()
    })

    it("dispatches resetHover when ref is undefined", () => {
        renderHook(() => useFeatureProperties(undefined, ["layer-1"], 0))
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("resetHover") }))
    })

    it("registers mousemove and mouseout listeners on the map", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1", "layer-2"], 0))
        expect(map.on).toHaveBeenCalledWith("mousemove", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("mouseout", expect.any(Function))
        expect(map.on).toHaveBeenCalledTimes(2)
    })

    it("dispatches setHover on mousemove when queryRenderedFeatures returns features", () => {
        const map = makeMockMap([{ id: 1, properties: { x: 1 } }])
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", { point: { x: 0, y: 0 } })
        })

        expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ x: 0, y: 0 }, { layers: ["layer-1"] })
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ payload: { entries: [{ id: 1, values: { x: 1 } }] } }),
        )
    })

    it("dispatches resetHover on mousemove when queryRenderedFeatures returns empty", () => {
        const map = makeMockMap([])
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", { point: { x: 0, y: 0 } })
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("resetHover") }))
    })

    it("dispatches resetHover on mouseout", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mouseout")
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("resetHover") }))
    })

    it("deduplicates features with the same id on mousemove", () => {
        const map = makeMockMap([
            { id: 1, properties: { x: 1 } },
            { id: 1, properties: { x: 1 } },
            { id: 2, properties: { x: 2 } },
        ])
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", { point: { x: 0, y: 0 } })
        })

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: {
                    entries: [
                        { id: 1, values: { x: 1 } },
                        { id: 2, values: { x: 2 } },
                    ],
                },
            }),
        )
    })

    it("unsubscribes all listeners on unmount", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        const { unmount } = renderHook(() => useFeatureProperties(ref, ["layer-1", "layer-2"], 0))

        unmount()

        const allHandlers = [...map.getHandlers("mousemove"), ...map.getHandlers("mouseout")]
        for (const h of allHandlers) {
            expect(h.unsubscribe).toHaveBeenCalled()
        }
    })
})

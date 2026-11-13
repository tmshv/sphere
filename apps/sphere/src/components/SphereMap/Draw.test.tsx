import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke, drawControls } = vi.hoisted(() => ({
    mockInvoke: vi.fn(),
    drawControls: [] as { load: ReturnType<typeof vi.fn>; unload: ReturnType<typeof vi.fn> }[],
}))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

// The draw control: records what the working-set loader loads into it
vi.mock("@sphere/draw", () => ({
    default: class FakeDraw {
        load = vi.fn()
        unload = vi.fn()
        constructor() {
            drawControls.push(this)
        }
    },
}))

const mapRefs: Record<string, unknown> = {}

vi.mock("react-map-gl/maplibre", async () => {
    const { useState } = await import("react")
    return {
        useControl: (factory: () => unknown) => useState(factory)[0],
        useMap: () => mapRefs,
    }
})

import drawReducer from "@/store/draw"
import selectionReducer from "@/store/selection"
import { flushAsync } from "@/testutils"
import type { DrawEvent } from "@/types"
import { configureStore } from "@reduxjs/toolkit"
import { act, render } from "@testing-library/react"
import { Provider } from "react-redux"
import { actions } from "@/store/actions"
import Draw from "./Draw"

const MAP_ID = "main"
const SOURCE_ID = "s1"

type Handler = (event: DrawEvent) => void

/** A map that records its `on` handlers and has fixed bounds. */
function makeMap() {
    const handlers = new Map<string, Set<Handler>>()
    const map = {
        on: (type: string, handler: Handler) => {
            const set = handlers.get(type) ?? new Set<Handler>()
            set.add(handler)
            handlers.set(type, set)
            return { unsubscribe: () => set.delete(handler) }
        },
        getBounds: () => ({ getWest: () => 0, getSouth: () => 0, getEast: () => 10, getNorth: () => 10 }),
    }
    const fire = (event: DrawEvent) => {
        act(() => {
            for (const handler of [...(handlers.get(event.type) ?? [])]) {
                handler(event)
            }
        })
    }
    mapRefs[MAP_ID] = { getMap: () => map }
    return { fire }
}

function point(id: number | string): GeoJSON.Feature {
    return { type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates: [1, 1] } }
}

function mockCommands(loadedIds: number[]) {
    const features = JSON.stringify({ type: "FeatureCollection", features: loadedIds.map(point) })
    mockInvoke.mockImplementation((cmd: string) => {
        switch (cmd) {
            case "selection_get_ids":
                return Promise.resolve([])
            case "draw_get_working_set":
                return Promise.resolve({ features, overCap: false })
            case "draw_apply":
                return Promise.resolve(42)
            default:
                return Promise.reject(`unexpected command ${cmd}`)
        }
    })
}

function workingSetQueries() {
    return mockInvoke.mock.calls.filter(([cmd]) => cmd === "draw_get_working_set").length
}

async function renderDraw() {
    const store = configureStore({
        reducer: { draw: drawReducer, selection: selectionReducer },
        preloadedState: { draw: { sourceId: SOURCE_ID, pending: false, hiddenIds: [] } },
    })
    const view = render(
        <Provider store={store}>
            <Draw mapId={MAP_ID} sourceId={SOURCE_ID} />
        </Provider>,
    )
    await act(flushAsync)
    return { store, view }
}

describe("Draw", () => {
    beforeEach(() => {
        drawControls.length = 0
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    test("loads the working set into the draw control and reports its ids as hidden", async () => {
        makeMap()
        mockCommands([4, 7])

        const { store } = await renderDraw()

        expect(drawControls.at(-1)?.load).toHaveBeenCalledWith({
            type: "FeatureCollection",
            features: [point(4), point(7)],
        })
        expect(store.getState().draw.hiddenIds).toEqual([4, 7])
    })

    test("forwards an edit on the map to the backend as an edit op", async () => {
        const { fire } = makeMap()
        mockCommands([])
        await renderDraw()

        const created = point("draw-1")
        fire({ type: "draw.create", features: [created] })
        await act(flushAsync)

        expect(mockInvoke).toHaveBeenCalledWith("draw_apply", {
            id: SOURCE_ID,
            op: { type: "create", drawId: "draw-1", feature: created },
        })
    })

    test("no working-set load starts while a commit or cancel is pending, and loads resume after", async () => {
        const { fire } = makeMap()
        mockCommands([4])
        const { store } = await renderDraw()
        expect(workingSetQueries()).toBe(1)

        act(() => {
            store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        })
        fire({ type: "moveend" })
        await act(flushAsync)
        expect(workingSetQueries()).toBe(1)

        act(() => {
            store.dispatch(actions.draw.settle())
        })
        fire({ type: "moveend" })
        await act(flushAsync)
        expect(workingSetQueries()).toBe(2)
    })
})

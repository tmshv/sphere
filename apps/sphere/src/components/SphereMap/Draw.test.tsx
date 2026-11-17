import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke, drawControls } = vi.hoisted(() => ({
    mockInvoke: vi.fn(),
    drawControls: [] as {
        load: ReturnType<typeof vi.fn>
        unload: ReturnType<typeof vi.fn>
        setSelected: ReturnType<typeof vi.fn>
        options: Record<string, unknown>
    }[],
}))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

// The draw control: records what the working-set loader loads into it
vi.mock("@sphere/draw", () => ({
    default: class FakeDraw {
        load = vi.fn()
        unload = vi.fn()
        setSelected = vi.fn()
        options: Record<string, unknown>
        constructor(options: Record<string, unknown>) {
            this.options = options
            drawControls.push(this)
        }
    },
    // Tagged so the test can tell it was called with the app's options
    spherePreset: (options: unknown) => [{ preset: options }],
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
import settingsReducer, { settingsSlice } from "@/store/settings"
import { DRAW_WORKING_SET_CAP, FEATURE_HIGHLIGHT_COLOR, PREVIEW_COLOR, PREVIEW_RADIUS } from "@/const"
import { flushAsync } from "@/testutils"
import type { DrawActionable, DrawEvent } from "@/types"
import { emitSelectionDelta, emitSelectionReconcile } from "@/lib/selection-bus"
import { type Middleware, type UnknownAction, configureStore } from "@reduxjs/toolkit"
import { act, render } from "@testing-library/react"
import { Provider } from "react-redux"
import { actions } from "@/store/actions"
import { getDrawControl } from "@/lib/draw-control"
import Draw from "./Draw"

const MAP_ID = "main"
const SOURCE_ID = "s1"

type FiredEvent = DrawEvent & { mode?: string; actions?: DrawActionable }

type Handler = (event: FiredEvent) => void

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
    const fire = (event: FiredEvent) => {
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

function featureCollection(ids: number[]): string {
    return JSON.stringify({ type: "FeatureCollection", features: ids.map(point) })
}

type WorkingSetArgs = { scope?: { type: string; ids?: number[] } }

/** The viewport holds `loadedIds`; a selection query returns the features asked for. */
function mockCommands(loadedIds: number[], selectionIds: number[] = []) {
    mockInvoke.mockImplementation((cmd: string, args: WorkingSetArgs = {}) => {
        switch (cmd) {
            case "selection_get_ids":
                return Promise.resolve(selectionIds)
            case "draw_get_working_set": {
                const ids = args.scope?.type === "ids" ? (args.scope.ids ?? []) : loadedIds
                return Promise.resolve({ features: featureCollection(ids), overCap: false })
            }
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

function isAction(value: unknown): value is UnknownAction {
    return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
}

async function renderDraw(previewOutline?: boolean, selectionSourceId?: string) {
    const dispatched: UnknownAction[] = []
    const capture: Middleware = () => next => action => {
        if (isAction(action)) {
            dispatched.push(action)
        }
        return next(action)
    }
    const store = configureStore({
        reducer: { draw: drawReducer, selection: selectionReducer, settings: settingsReducer },
        preloadedState: {
            draw: {
                sourceId: SOURCE_ID,
                pending: false,
                hiddenIds: [],
                actionable: { trash: false, combineFeatures: false, uncombineFeatures: false },
            },
            selection: { count: 0, version: 0, sourceId: selectionSourceId },
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(capture),
    })
    if (previewOutline === false) {
        store.dispatch(settingsSlice.actions.togglePreviewOutline())
    }
    const view = render(
        <Provider store={store}>
            <Draw mapId={MAP_ID} sourceId={SOURCE_ID} />
        </Provider>,
    )
    await act(flushAsync)
    return { store, view, dispatched }
}

function lastDraw() {
    const draw = drawControls.at(-1)
    if (!draw) {
        throw new Error("No draw control was built")
    }
    return draw
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

    test.each([true, false])("builds the control with the sphere preset (outline %s)", async outline => {
        makeMap()
        mockCommands([])

        await renderDraw(outline)

        const options = drawControls.at(-1)?.options
        expect(options?.boxSelect).toBe(false)
        expect(options?.styles).toEqual([
            {
                preset: {
                    color: PREVIEW_COLOR,
                    highlightColor: FEATURE_HIGHLIGHT_COLOR,
                    outline,
                    pointRadius: PREVIEW_RADIUS,
                },
            },
        ])
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

    test("a selection delta selects in draw the selected features that are loaded", async () => {
        makeMap()
        mockCommands([4, 7])
        await renderDraw()

        act(() => emitSelectionDelta({ added: [4, 9], removed: [] }))
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([4])

        act(() => emitSelectionDelta({ added: [7], removed: [4] }))
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([7])
    })

    test("a reconcile replaces draw's selection, and one for another source clears it", async () => {
        makeMap()
        mockCommands([4, 7])
        await renderDraw()

        act(() => emitSelectionReconcile([7], SOURCE_ID))
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([7])

        act(() => emitSelectionReconcile([4], "other"))
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([])
    })

    test("a selection change loads the selected features that are not loaded yet", async () => {
        makeMap()
        mockCommands([4])
        await renderDraw()

        act(() => emitSelectionDelta({ added: [9], removed: [] }))
        await act(flushAsync)

        expect(mockInvoke).toHaveBeenLastCalledWith("draw_get_working_set", {
            id: SOURCE_ID,
            scope: { type: "ids", ids: [9] },
            cap: DRAW_WORKING_SET_CAP,
        })
        // Once loaded, the feature is selected in draw
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([9])
    })

    test("a drag step selects the loaded features in draw and loads nothing; the drag's end loads", async () => {
        makeMap()
        mockCommands([4])
        await renderDraw()
        const queries = workingSetQueries()

        act(() => emitSelectionDelta({ added: [4, 9], removed: [] }, { dragging: true }))
        await act(flushAsync)
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([4])
        expect(workingSetQueries()).toBe(queries)

        act(() => emitSelectionReconcile([4, 9], SOURCE_ID))
        await act(flushAsync)
        expect(mockInvoke).toHaveBeenLastCalledWith("draw_get_working_set", {
            id: SOURCE_ID,
            scope: { type: "ids", ids: [9] },
            cap: DRAW_WORKING_SET_CAP,
        })
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([4, 9])
    })

    test("a selection over the cap unloads the features only it loaded", async () => {
        makeMap()
        mockCommands([4])
        await renderDraw()
        act(() => emitSelectionDelta({ added: [9], removed: [] }))
        await act(flushAsync)
        lastDraw().unload.mockClear()

        const overCap = Array.from({ length: DRAW_WORKING_SET_CAP + 1 }, (_, i) => i + 1)
        act(() => emitSelectionReconcile(overCap, SOURCE_ID))
        await act(flushAsync)

        expect(lastDraw().unload).toHaveBeenLastCalledWith([9])
        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([4])
    })

    test("starts with the selection of the drawn source selected in draw once it is loaded", async () => {
        makeMap()
        mockCommands([4], [7])

        await renderDraw(true, SOURCE_ID)

        expect(lastDraw().setSelected).toHaveBeenLastCalledWith([7])
    })

    test("a selection on another source is not draw's", async () => {
        makeMap()
        mockCommands([4, 7], [7])

        await renderDraw(true, "other")

        expect(lastDraw().setSelected).not.toHaveBeenCalledWith([7])
    })

    test("a selection change in draw dispatches draw.selectionChanged with the feature ids", async () => {
        const { fire } = makeMap()
        mockCommands([4])
        const { dispatched } = await renderDraw()

        fire({ type: "draw.selectionchange", features: [point(4)] })

        expect(dispatched).toContainEqual(actions.draw.selectionChanged({ sourceId: SOURCE_ID, ids: [4] }))
    })

    test("a mode change of the control dispatches draw.modeChanged", async () => {
        const { fire } = makeMap()
        mockCommands([])
        const { store } = await renderDraw()

        fire({ type: "draw.modechange", mode: "draw_line_string" })

        expect(store.getState().draw.mode).toBe("draw_line_string")
    })

    test("builds the control without map buttons, with every draw tool enabled", async () => {
        makeMap()
        mockCommands([])

        await renderDraw()

        const options = lastDraw().options
        expect(options.buttons).toBe(false)
        expect(options.controls).toEqual({
            point: true,
            polygon: true,
            line_string: true,
            combine_features: true,
            uncombine_features: true,
            trash: true,
        })
        expect(options.displayControlsDefault).toBe(false)
    })

    test("registers the control for its source while mounted, and unregisters it on unmount", async () => {
        makeMap()
        mockCommands([])
        const { view } = await renderDraw()

        expect(getDrawControl(SOURCE_ID)).toBe(lastDraw())

        view.unmount()

        expect(getDrawControl(SOURCE_ID)).toBeUndefined()
    })

    test("an actionable change of the control dispatches draw.actionableChanged", async () => {
        const { fire } = makeMap()
        mockCommands([])
        const { store } = await renderDraw()
        const actionable = { trash: true, combineFeatures: true, uncombineFeatures: false }

        fire({ type: "draw.actionable", actions: actionable })

        expect(store.getState().draw.actionable).toEqual(actionable)
    })

    test("the selection bus subscription ends on unmount", async () => {
        makeMap()
        mockCommands([4])
        const { view } = await renderDraw()
        const draw = lastDraw()
        draw.setSelected.mockClear()

        view.unmount()
        emitSelectionDelta({ added: [4], removed: [] })
        emitSelectionReconcile([4], SOURCE_ID)

        expect(draw.setSelected).not.toHaveBeenCalled()
    })
})

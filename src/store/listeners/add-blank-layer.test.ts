import { LayerType, SourceType } from "@/types"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@/lib/nextId", () => ({
    nextId: vi.fn(() => "layer-test-id"),
}))

vi.mock("@/lib/color-scheme", () => ({
    nextColor: vi.fn(() => "#aabbcc"),
}))

vi.mock("@/lib/predict-layer-type", () => ({
    default: vi.fn(),
    fallbackLayerType: vi.fn(),
}))

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            layer: {
                addBlankLayer: makeAction("layer/addBlankLayer"),
                addLayer: (payload: unknown) => ({ type: "layer/addLayer", payload }),
                setSource: (payload: unknown) => ({ type: "layer/setSource", payload }),
                setType: (payload: unknown) => ({ type: "layer/setType", payload }),
                select: (payload: unknown) => ({ type: "layer/select", payload }),
            },
            app: {
                setActiveSidebarTab: (payload: unknown) => ({ type: "app/setActiveSidebarTab", payload }),
            },
        },
    }
})

import predictLayerType, { fallbackLayerType } from "@/lib/predict-layer-type"
import listener from "./add-blank-layer"

function hasType(action: unknown, type: string): action is { type: string; payload: unknown } {
    return (
        typeof action === "object" && action !== null && "type" in action && (action as { type: string }).type === type
    )
}

function makeStore(state: Record<string, unknown> = {}) {
    const dispatchedActions: unknown[] = []
    const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
        dispatchedActions.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: (s = state) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware()
                .prepend(listener.middleware)
                .concat(captureMiddleware as unknown as Middleware),
    })
    return { store, dispatchedActions }
}

describe("add-blank-layer listener middleware", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("exports a listener middleware instance", () => {
        expect(listener).toBeDefined()
        expect(typeof listener.middleware).toBe("function")
    })

    test("always dispatches addLayer and setActiveSidebarTab regardless of source", async () => {
        const { store, dispatchedActions } = makeStore({ source: { items: {} } })

        store.dispatch({ type: "layer/addBlankLayer", payload: undefined })
        await vi.runAllTimersAsync()

        const addLayerAction = dispatchedActions.find(a => hasType(a, "layer/addLayer"))
        expect(addLayerAction).toBeDefined()

        const setTabAction = dispatchedActions.find(a => hasType(a, "app/setActiveSidebarTab"))
        expect(setTabAction).toBeDefined()
        expect(setTabAction?.payload).toBe("layers")
    })

    test("does not dispatch setSource or setType when no sourceId", async () => {
        const { store, dispatchedActions } = makeStore({ source: { items: {} } })

        store.dispatch({ type: "layer/addBlankLayer", payload: undefined })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => hasType(a, "layer/setSource"))).toBeUndefined()
        expect(dispatchedActions.find(a => hasType(a, "layer/setType"))).toBeUndefined()
    })

    test("dispatches setSource when sourceId is provided", async () => {
        const sourceId = "source-1"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.Geojson,
                        name: "test",
                        meta: { columns: {}, pointsCount: 1, linesCount: 0, polygonsCount: 0 },
                        pending: false,
                    },
                },
            },
        })
        vi.mocked(predictLayerType).mockReturnValue(LayerType.Point)

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        const setSourceAction = dispatchedActions.find(a => hasType(a, "layer/setSource"))
        expect(setSourceAction).toBeDefined()
        expect((setSourceAction as { payload: unknown }).payload).toEqual(expect.objectContaining({ sourceId }))
    })

    test("dispatches setType with predicted type for Geojson source", async () => {
        const sourceId = "geojson-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.Geojson,
                        name: "test",
                        meta: { columns: {}, pointsCount: 0, linesCount: 1, polygonsCount: 0 },
                        pending: false,
                    },
                },
            },
        })
        vi.mocked(predictLayerType).mockReturnValue(LayerType.Line)

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find(a => hasType(a, "layer/setType"))
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as { payload: unknown }).payload).toEqual(
            expect.objectContaining({ type: LayerType.Line }),
        )
    })

    test("dispatches setType with predicted type for FeatureCollection source", async () => {
        const sourceId = "fc-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.FeatureCollection,
                        name: "test",
                        location: "sphere://fc-source",
                        version: 0,
                        editable: true,
                        fractionIndex: 0,
                        meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 1 },
                        pending: false,
                    },
                },
            },
        })
        vi.mocked(predictLayerType).mockReturnValue(LayerType.Polygon)

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find(a => hasType(a, "layer/setType"))
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as { payload: unknown }).payload).toEqual(
            expect.objectContaining({ type: LayerType.Polygon }),
        )
    })

    test("falls back to LayerType.Point when predictLayerType returns undefined (all-zero counts)", async () => {
        const sourceId = "mixed-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.Geojson,
                        name: "test",
                        meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
                        pending: false,
                    },
                },
            },
        })
        vi.mocked(predictLayerType).mockReturnValue(undefined)
        vi.mocked(fallbackLayerType).mockReturnValue(LayerType.Point)

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find(a => hasType(a, "layer/setType"))
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as { payload: unknown }).payload).toEqual(
            expect.objectContaining({ type: LayerType.Point }),
        )
    })

    test("falls back to LayerType.Line for a lines+polygons mixed source (no points)", async () => {
        const sourceId = "lines-polygons-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.Geojson,
                        name: "test",
                        meta: { columns: {}, pointsCount: 0, linesCount: 5, polygonsCount: 3 },
                        pending: false,
                    },
                },
            },
        })
        vi.mocked(predictLayerType).mockReturnValue(undefined)
        vi.mocked(fallbackLayerType).mockReturnValue(LayerType.Line)

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find(a => hasType(a, "layer/setType"))
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as { payload: unknown }).payload).toEqual(
            expect.objectContaining({ type: LayerType.Line }),
        )
    })

    test("does not dispatch setType when FeatureCollection source is pending", async () => {
        const sourceId = "pending-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.FeatureCollection,
                        name: "test",
                        pending: true,
                    },
                },
            },
        })

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => hasType(a, "layer/setType"))).toBeUndefined()
    })

    test("does not dispatch setType for MVT source", async () => {
        const sourceId = "mvt-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.MVT,
                        name: "test",
                        format: "pbf",
                        sourceLayers: [],
                        pending: false,
                    },
                },
            },
        })

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => hasType(a, "layer/setType"))).toBeUndefined()
    })

    test("dispatches setType Raster for raster MVT source", async () => {
        const sourceId = "raster-mbtiles-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.MVT,
                        name: "test",
                        format: "png",
                        sourceLayers: [],
                        pending: false,
                    },
                },
            },
        })

        store.dispatch({ type: "layer/addBlankLayer", payload: sourceId })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find(a => hasType(a, "layer/setType"))
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as { payload: unknown }).payload).toEqual(
            expect.objectContaining({ type: LayerType.Raster }),
        )
    })
})

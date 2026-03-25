import { LayerType, SourceType } from "@/types"
import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            layer: {
                setSource: makeAction("layer/setSource"),
                setType: (payload: unknown) => ({ type: "layer/setType", payload }),
                setLayerFilter: (payload: unknown) => ({ type: "layer/setLayerFilter", payload }),
            },
        },
    }
})

import listener from "./set-source"

function makeStore(state: Record<string, unknown> = {}) {
    const dispatchedActions: unknown[] = []
    const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
        dispatchedActions.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: (s: unknown = state) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware()
                .prepend(listener.middleware)
                .concat(
                    captureMiddleware as Parameters<typeof getDefaultMiddleware>[0] extends {
                        concat: (m: infer M) => unknown
                    }
                        ? M
                        : never,
                ),
    })
    return { store, dispatchedActions }
}

describe("set-source listener middleware", () => {
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

    test("dispatches setType Raster when switching to a raster MVT source", async () => {
        const layerId = "layer-1"
        const sourceId = "raster-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.MVT,
                        format: "png",
                        sourceLayers: [],
                        pending: false,
                    },
                },
            },
            layer: {
                items: {
                    [layerId]: { id: layerId, type: LayerType.Point },
                },
            },
        })

        store.dispatch({ type: "layer/setSource", payload: { id: layerId, sourceId } })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find((a: any) => a.type === "layer/setType")
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as any).payload.type).toBe(LayerType.Raster)
    })

    test("clears filter when switching to a raster MVT source", async () => {
        const layerId = "layer-1"
        const sourceId = "raster-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.MVT,
                        format: "jpg",
                        sourceLayers: [],
                        pending: false,
                    },
                },
            },
            layer: {
                items: {
                    [layerId]: { id: layerId, type: LayerType.Point },
                },
            },
        })

        store.dispatch({ type: "layer/setSource", payload: { id: layerId, sourceId } })
        await vi.runAllTimersAsync()

        const filterAction = dispatchedActions.find((a: any) => a.type === "layer/setLayerFilter")
        expect(filterAction).toBeDefined()
        expect((filterAction as any).payload.expression).toBeNull()
    })

    test("dispatches setType Raster when switching to a Raster source", async () => {
        const layerId = "layer-1"
        const sourceId = "raster-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.Raster,
                        pending: false,
                    },
                },
            },
            layer: {
                items: {
                    [layerId]: { id: layerId, type: LayerType.Point },
                },
            },
        })

        store.dispatch({ type: "layer/setSource", payload: { id: layerId, sourceId } })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find((a: any) => a.type === "layer/setType")
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as any).payload.type).toBe(LayerType.Raster)
    })

    test("resets type from Raster to Point when switching to a vector source", async () => {
        const layerId = "layer-1"
        const sourceId = "vector-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.MVT,
                        format: "pbf",
                        sourceLayers: [],
                        pending: false,
                    },
                },
            },
            layer: {
                items: {
                    [layerId]: { id: layerId, type: LayerType.Raster },
                },
            },
        })

        store.dispatch({ type: "layer/setSource", payload: { id: layerId, sourceId } })
        await vi.runAllTimersAsync()

        const setTypeAction = dispatchedActions.find((a: any) => a.type === "layer/setType")
        expect(setTypeAction).toBeDefined()
        expect((setTypeAction as any).payload.type).toBe(LayerType.Point)
    })

    test("does not dispatch setType when switching between non-raster sources", async () => {
        const layerId = "layer-1"
        const sourceId = "vector-source"
        const { store, dispatchedActions } = makeStore({
            source: {
                items: {
                    [sourceId]: {
                        id: sourceId,
                        type: SourceType.MVT,
                        format: "pbf",
                        sourceLayers: [],
                        pending: false,
                    },
                },
            },
            layer: {
                items: {
                    [layerId]: { id: layerId, type: LayerType.Point },
                },
            },
        })

        store.dispatch({ type: "layer/setSource", payload: { id: layerId, sourceId } })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find((a: any) => a.type === "layer/setType")).toBeUndefined()
    })
})

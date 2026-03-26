import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({
    mockInvoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@tauri-apps/api/core", () => ({
    invoke: mockInvoke,
}))

vi.mock("@/logger", () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            draw: {
                commit: makeAction("draw/commit"),
                done: (payload: unknown) => ({ type: "draw/done", payload }),
            },
            source: {
                bumpVersion: (payload: unknown) => ({ type: "source/bumpVersion", payload }),
            },
            tools: {
                reset: () => ({ type: "tools/reset" }),
            },
        },
    }
})

import listener from "./save-draw"

const featureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: { type: "Point", coordinates: [10, 20] },
            properties: { name: "test" },
        },
    ],
}

type DispatchedAction = { type: string; payload?: unknown }

function makeStore() {
    const dispatchedActions: DispatchedAction[] = []
    const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
        dispatchedActions.push(action as DispatchedAction)
        return next(action)
    }
    const store = configureStore({
        reducer: (s: Record<string, unknown> = {}) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware()
                .prepend(listener.middleware)
                // biome-ignore lint/suspicious/noExplicitAny: Redux Toolkit middleware type system requires escape hatch
                .concat(captureMiddleware as any),
    })
    return { store, dispatchedActions }
}

describe("save-draw listener", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        mockInvoke.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("calls source_replace and dispatches bumpVersion, done, and reset on success", async () => {
        const sourceId = "draw-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, data: featureCollection } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_replace", { id: sourceId, data: featureCollection })

        expect(dispatchedActions.find(a => a.type === "source/bumpVersion")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeDefined()
    })

    test("does not dispatch done or reset when source_replace fails", async () => {
        mockInvoke.mockRejectedValue(new Error("IPC error"))

        const sourceId = "draw-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, data: featureCollection } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(dispatchedActions.find(a => a.type === "source/bumpVersion")).toBeUndefined()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeUndefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeUndefined()
    })

    test("passes correct sourceId to bumpVersion and done", async () => {
        const sourceId = "my-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, data: featureCollection } })
        await vi.runAllTimersAsync()

        const bumpAction = dispatchedActions.find(a => a.type === "source/bumpVersion")
        expect(bumpAction?.payload).toBe(sourceId)

        const doneAction = dispatchedActions.find(a => a.type === "draw/done")
        expect((doneAction?.payload as { sourceId: string }).sourceId).toBe(sourceId)
    })
})

import { configureStore, type Middleware } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const mockSelectionGetIds = vi.fn<() => Promise<number[]>>()

vi.mock("@/lib/selection-ipc", () => ({
    selectionGetIds: () => mockSelectionGetIds(),
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
                start: makeAction("draw/start"),
                setSelectedIds: makeAction("draw/setSelectedIds"),
            },
            tools: {
                setTool: makeAction("tools/setTool"),
            },
        },
    }
})

import listener from "./start-draw"

type Action = { type: string; payload?: unknown }

function makeStore(state: Record<string, unknown> = {}) {
    const dispatchedActions: Action[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action as Action)
        return next(action)
    }
    const store = configureStore({
        reducer: (s = state) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware().prepend(listener.middleware).concat(captureMiddleware),
    })
    return { store, dispatchedActions }
}

describe("start-draw listener", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("dispatches setSelectedIds with IPC result when selection matches source", async () => {
        mockSelectionGetIds.mockResolvedValue([10, 20])
        const { store, dispatchedActions } = makeStore({
            selection: { count: 2, sourceId: "s1", version: 1 },
        })

        store.dispatch({ type: "draw/start", payload: { sourceId: "s1" } })
        await vi.runAllTimersAsync()

        expect(mockSelectionGetIds).toHaveBeenCalled()
        expect(
            dispatchedActions.find(a => a.type === "draw/setSelectedIds" && JSON.stringify(a.payload) === "[10,20]"),
        ).toBeDefined()
    })

    test("dispatches setSelectedIds with empty array when no selection", async () => {
        const { store, dispatchedActions } = makeStore({
            selection: { count: 0, sourceId: null, version: 0 },
        })

        store.dispatch({ type: "draw/start", payload: { sourceId: "s1" } })
        await vi.runAllTimersAsync()

        expect(mockSelectionGetIds).not.toHaveBeenCalled()
        expect(
            dispatchedActions.find(a => a.type === "draw/setSelectedIds" && JSON.stringify(a.payload) === "[]"),
        ).toBeDefined()
    })

    test("dispatches setSelectedIds with empty array when selection is for different source", async () => {
        const { store, dispatchedActions } = makeStore({
            selection: { count: 3, sourceId: "s2", version: 1 },
        })

        store.dispatch({ type: "draw/start", payload: { sourceId: "s1" } })
        await vi.runAllTimersAsync()

        expect(mockSelectionGetIds).not.toHaveBeenCalled()
        expect(
            dispatchedActions.find(a => a.type === "draw/setSelectedIds" && JSON.stringify(a.payload) === "[]"),
        ).toBeDefined()
    })

    test("dispatches tools/setTool draw after resolving selection", async () => {
        mockSelectionGetIds.mockResolvedValue([1])
        const { store, dispatchedActions } = makeStore({
            selection: { count: 1, sourceId: "s1", version: 1 },
        })

        store.dispatch({ type: "draw/start", payload: { sourceId: "s1" } })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "tools/setTool" && a.payload === "draw")).toBeDefined()
    })

    test("handles IPC failure gracefully", async () => {
        mockSelectionGetIds.mockRejectedValue(new Error("IPC error"))
        const { store, dispatchedActions } = makeStore({
            selection: { count: 2, sourceId: "s1", version: 1 },
        })

        store.dispatch({ type: "draw/start", payload: { sourceId: "s1" } })
        await vi.runAllTimersAsync()

        expect(
            dispatchedActions.find(a => a.type === "draw/setSelectedIds" && JSON.stringify(a.payload) === "[]"),
        ).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "tools/setTool" && a.payload === "draw")).toBeDefined()
    })
})

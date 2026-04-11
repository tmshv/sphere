import { type Middleware, configureStore } from "@reduxjs/toolkit"
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
                .concat(captureMiddleware as unknown as Middleware),
    })
    return { store, dispatchedActions }
}

const patch = {
    added: [
        {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [10, 20] },
            properties: { name: "new" },
        },
    ],
    updated: [
        {
            type: "Feature" as const,
            id: 1,
            geometry: { type: "Point" as const, coordinates: [30, 40] },
            properties: { name: "changed" },
        },
    ],
    deleted_ids: [2, 3],
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

    test("calls source_patch and dispatches bumpVersion, done, and reset on success", async () => {
        const sourceId = "draw-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_patch", { id: sourceId, patch })

        expect(dispatchedActions.find(a => a.type === "source/bumpVersion")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeDefined()
    })

    test("does not dispatch done or reset when source_patch fails", async () => {
        mockInvoke.mockRejectedValue(new Error("IPC error"))

        const sourceId = "draw-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(dispatchedActions.find(a => a.type === "source/bumpVersion")).toBeUndefined()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeUndefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeUndefined()
    })

    test("passes correct sourceId to bumpVersion and done", async () => {
        const sourceId = "my-source"
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch } })
        await vi.runAllTimersAsync()

        const bumpAction = dispatchedActions.find(a => a.type === "source/bumpVersion")
        expect(bumpAction?.payload).toBe(sourceId)

        const doneAction = dispatchedActions.find(a => a.type === "draw/done")
        expect((doneAction?.payload as { sourceId: string }).sourceId).toBe(sourceId)
    })

    test("calls source_patch when only added is non-empty", async () => {
        const sourceId = "draw-source"
        const addedOnlyPatch = { added: patch.added, updated: [], deleted_ids: [] }
        const { store } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch: addedOnlyPatch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_patch", { id: sourceId, patch: addedOnlyPatch })
    })

    test("calls source_patch when only updated is non-empty", async () => {
        const sourceId = "draw-source"
        const updatedOnlyPatch = { added: [], updated: patch.updated, deleted_ids: [] }
        const { store } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch: updatedOnlyPatch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_patch", { id: sourceId, patch: updatedOnlyPatch })
    })

    test("calls source_patch when only deleted_ids is non-empty", async () => {
        const sourceId = "draw-source"
        const deletedOnlyPatch = { added: [], updated: [], deleted_ids: patch.deleted_ids }
        const { store } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch: deletedOnlyPatch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_patch", { id: sourceId, patch: deletedOnlyPatch })
    })

    test("skips IPC when patch is empty", async () => {
        const sourceId = "draw-source"
        const emptyPatch = { added: [], updated: [], deleted_ids: [] }
        const { store, dispatchedActions } = makeStore()

        store.dispatch({ type: "draw/commit", payload: { sourceId, patch: emptyPatch } })
        await vi.runAllTimersAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
        expect(dispatchedActions.find(a => a.type === "draw/done")).toBeDefined()
        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeDefined()
    })
})

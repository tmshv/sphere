import { configureStore, type Middleware } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            source: {
                removeSource: makeAction("source/removeSource"),
            },
            tools: {
                reset: makeAction("tools/reset"),
            },
        },
    }
})

import listener from "./exit-draw-on-source-delete"

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

describe("exit-draw-on-source-delete listener", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("dispatches tools/reset when the deleted source is the active draw source", async () => {
        const { store, dispatchedActions } = makeStore({
            draw: { sourceId: "s1" },
        })

        store.dispatch({ type: "source/removeSource", payload: "s1" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeDefined()
    })

    test("does not dispatch tools/reset when the deleted source is not the active draw source", async () => {
        const { store, dispatchedActions } = makeStore({
            draw: { sourceId: "s2" },
        })

        store.dispatch({ type: "source/removeSource", payload: "s1" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeUndefined()
    })

    test("does not dispatch tools/reset when draw is not active", async () => {
        const { store, dispatchedActions } = makeStore({
            draw: {},
        })

        store.dispatch({ type: "source/removeSource", payload: "s1" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "tools/reset")).toBeUndefined()
    })
})

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
            draw: {
                start: makeAction("draw/start"),
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

    test("dispatches tools/setTool draw on draw/start", async () => {
        const { store, dispatchedActions } = makeStore({})

        store.dispatch({ type: "draw/start", payload: { sourceId: "s1" } })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "tools/setTool" && a.payload === "draw")).toBeDefined()
    })
})

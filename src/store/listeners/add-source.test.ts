import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@/logger", () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("../actions", () => {
    // Defined inside factory to avoid hoisting reference errors
    const makeFulfilled = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            source: {
                addFromUrl: { fulfilled: makeFulfilled("source/addFromUrl/fulfilled") },
                addFromClipboard: { fulfilled: makeFulfilled("source/addFromClipboard/fulfilled") },
                select: (payload: unknown) => ({ type: "source/select", payload }),
            },
        },
    }
})

import logger from "@/logger"
import listener from "./add-source"

const URL_FULFILLED_TYPE = "source/addFromUrl/fulfilled"
const CLIPBOARD_FULFILLED_TYPE = "source/addFromClipboard/fulfilled"
const FULFILLED_TYPE = URL_FULFILLED_TYPE

function hasType(action: unknown, type: string): action is { type: string; payload: unknown } {
    return (
        typeof action === "object" && action !== null && "type" in action && (action as { type: string }).type === type
    )
}

describe("add-source listener middleware", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test("exports a listener middleware instance", () => {
        expect(listener).toBeDefined()
        expect(typeof listener.middleware).toBe("function")
        expect(typeof listener.startListening).toBe("function")
    })

    test("logs when source.addFromUrl.fulfilled fires", async () => {
        vi.clearAllMocks()

        const store = configureStore({
            reducer: (state = {}) => state,
            middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listener.middleware),
        })

        const action = {
            type: FULFILLED_TYPE,
            payload: undefined,
            meta: { requestId: "test-request", arg: undefined, requestStatus: "fulfilled" },
        }
        store.dispatch(action)

        // Flush all pending timers/microtasks so the async listener effect runs
        await vi.runAllTimersAsync()

        expect(vi.mocked(logger.info)).toHaveBeenCalledWith({ action }, "Source was added")
    })

    test("dispatches selectSource with lastAdded when source is added", async () => {
        vi.clearAllMocks()

        const sourceId = "source-1"
        const dispatchedActions: unknown[] = []
        const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
            dispatchedActions.push(action)
            return next(action)
        }

        const initialState = { source: { lastAdded: sourceId, items: { [sourceId]: {} } } }
        const store = configureStore({
            reducer: (state = initialState) => state,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware()
                    .prepend(listener.middleware)
                    .concat(captureMiddleware as unknown as Middleware),
        })

        store.dispatch({
            type: FULFILLED_TYPE,
            payload: undefined,
            meta: { requestId: "test-request", arg: undefined, requestStatus: "fulfilled" },
        })

        await vi.runAllTimersAsync()

        const selectSourceAction = dispatchedActions.find(a => hasType(a, "source/select"))
        expect(selectSourceAction).toBeDefined()
        expect(selectSourceAction?.payload).toBe(sourceId)
    })

    test("does not dispatch selectSource when lastAdded is undefined", async () => {
        vi.clearAllMocks()

        const dispatchedActions: unknown[] = []
        const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
            dispatchedActions.push(action)
            return next(action)
        }

        const initialState = { source: { lastAdded: undefined, items: {} } }
        const store = configureStore({
            reducer: (state = initialState) => state,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware()
                    .prepend(listener.middleware)
                    .concat(captureMiddleware as unknown as Middleware),
        })

        store.dispatch({
            type: FULFILLED_TYPE,
            payload: undefined,
            meta: { requestId: "test-request", arg: undefined, requestStatus: "fulfilled" },
        })

        await vi.runAllTimersAsync()

        const selectSourceAction = dispatchedActions.find(a => hasType(a, "source/select"))
        expect(selectSourceAction).toBeUndefined()
    })

    test("dispatches selectSource when source/addFromClipboard/fulfilled fires", async () => {
        vi.clearAllMocks()

        const sourceId = "clipboard-source-1"
        const dispatchedActions: unknown[] = []
        const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
            dispatchedActions.push(action)
            return next(action)
        }

        const initialState = { source: { lastAdded: sourceId, items: { [sourceId]: {} } } }
        const store = configureStore({
            reducer: (state = initialState) => state,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware()
                    .prepend(listener.middleware)
                    .concat(captureMiddleware as unknown as Middleware),
        })

        store.dispatch({
            type: CLIPBOARD_FULFILLED_TYPE,
            payload: undefined,
            meta: { requestId: "test-request", arg: undefined, requestStatus: "fulfilled" },
        })

        await vi.runAllTimersAsync()

        const selectSourceAction = dispatchedActions.find(a => hasType(a, "source/select"))
        expect(selectSourceAction).toBeDefined()
        expect(selectSourceAction?.payload).toBe(sourceId)
    })
})

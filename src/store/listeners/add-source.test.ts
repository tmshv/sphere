import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@/logger", () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("../actions", () => {
    // Defined inside factory to avoid hoisting reference errors
    const fulfilledCreator = Object.assign((payload: unknown) => ({ type: "source/addFromUrl/fulfilled", payload }), {
        type: "source/addFromUrl/fulfilled",
        match: (action: { type: string }) => action.type === "source/addFromUrl/fulfilled",
    })
    return {
        actions: {
            source: {
                addFromUrl: {
                    fulfilled: fulfilledCreator,
                },
            },
            selection: {
                selectSource: (payload: unknown) => ({ type: "selection/selectSource", payload }),
            },
        },
    }
})

import logger from "@/logger"
import listener from "./add-source"

const FULFILLED_TYPE = "source/addFromUrl/fulfilled"

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

        const store = configureStore({
            reducer: (state: any = { source: { lastAdded: sourceId, items: { [sourceId]: {} } } }) => state,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware()
                    .prepend(listener.middleware)
                    .concat(captureMiddleware as any),
        })

        store.dispatch({
            type: FULFILLED_TYPE,
            payload: undefined,
            meta: { requestId: "test-request", arg: undefined, requestStatus: "fulfilled" },
        })

        await vi.runAllTimersAsync()

        const selectSourceAction = dispatchedActions.find((a: any) => a.type === "selection/selectSource")
        expect(selectSourceAction).toBeDefined()
        expect((selectSourceAction as any).payload.sourceId).toBe(sourceId)
    })

    test("does not dispatch selectSource when lastAdded is undefined", async () => {
        vi.clearAllMocks()

        const dispatchedActions: unknown[] = []
        const captureMiddleware = () => (next: (a: unknown) => unknown) => (action: unknown) => {
            dispatchedActions.push(action)
            return next(action)
        }

        const store = configureStore({
            reducer: (state: any = { source: { lastAdded: undefined, items: {} } }) => state,
            middleware: getDefaultMiddleware =>
                getDefaultMiddleware()
                    .prepend(listener.middleware)
                    .concat(captureMiddleware as any),
        })

        store.dispatch({
            type: FULFILLED_TYPE,
            payload: undefined,
            meta: { requestId: "test-request", arg: undefined, requestStatus: "fulfilled" },
        })

        await vi.runAllTimersAsync()

        const selectSourceAction = dispatchedActions.find((a: any) => a.type === "selection/selectSource")
        expect(selectSourceAction).toBeUndefined()
    })
})

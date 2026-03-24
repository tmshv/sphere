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
            layer: {
                removeLayer: makeAction("layer/removeLayer"),
                select: makeAction("layer/select"),
            },
            source: {
                removeSource: makeAction("source/removeSource"),
                select: makeAction("source/select"),
            },
        },
    }
})

import listener from "./auto-select-on-delete"

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

describe("auto-select-on-delete listener: layer branch", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("does not dispatch when deleted layer is not selected", async () => {
        const { store, dispatchedActions } = makeStore({
            layer: {
                selectedId: "l2",
                allIds: ["l1", "l2"],
                items: {
                    l1: { fractionIndex: 0 },
                    l2: { fractionIndex: 1 },
                },
            },
        })

        store.dispatch({ type: "layer/removeLayer", payload: "l1" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "layer/select")).toBeUndefined()
    })

    test("selects next layer when selected layer is deleted and a next sibling exists", async () => {
        const { store, dispatchedActions } = makeStore({
            layer: {
                selectedId: "l1",
                allIds: ["l1", "l2", "l3"],
                items: {
                    l1: { fractionIndex: 0 },
                    l2: { fractionIndex: 1 },
                    l3: { fractionIndex: 2 },
                },
            },
        })

        store.dispatch({ type: "layer/removeLayer", payload: "l1" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "layer/select")
        expect(selectAction).toMatchObject({ payload: "l2" })
    })

    test("selects previous layer when selected layer is the last in sort order", async () => {
        const { store, dispatchedActions } = makeStore({
            layer: {
                selectedId: "l3",
                allIds: ["l1", "l2", "l3"],
                items: {
                    l1: { fractionIndex: 0 },
                    l2: { fractionIndex: 1 },
                    l3: { fractionIndex: 2 },
                },
            },
        })

        store.dispatch({ type: "layer/removeLayer", payload: "l3" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "layer/select")
        expect(selectAction).toMatchObject({ payload: "l2" })
    })

    test("dispatches select with undefined when only one layer is deleted", async () => {
        const { store, dispatchedActions } = makeStore({
            layer: {
                selectedId: "l1",
                allIds: ["l1"],
                items: {
                    l1: { fractionIndex: 0 },
                },
            },
        })

        store.dispatch({ type: "layer/removeLayer", payload: "l1" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "layer/select")
        expect(selectAction).toBeDefined()
        expect(selectAction).toMatchObject({ payload: undefined })
    })

    test("selects next layer when a middle layer is deleted", async () => {
        const { store, dispatchedActions } = makeStore({
            layer: {
                selectedId: "l2",
                allIds: ["l1", "l2", "l3"],
                items: {
                    l1: { fractionIndex: 0 },
                    l2: { fractionIndex: 1 },
                    l3: { fractionIndex: 2 },
                },
            },
        })

        store.dispatch({ type: "layer/removeLayer", payload: "l2" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "layer/select")
        expect(selectAction).toMatchObject({ payload: "l3" })
    })

    test("uses fractionIndex order, not allIds order, to pick next layer", async () => {
        const { store, dispatchedActions } = makeStore({
            layer: {
                selectedId: "l1",
                allIds: ["l3", "l1", "l2"],
                items: {
                    l1: { fractionIndex: 1 },
                    l2: { fractionIndex: 2 },
                    l3: { fractionIndex: 0 },
                },
            },
        })

        store.dispatch({ type: "layer/removeLayer", payload: "l1" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "layer/select")
        expect(selectAction).toMatchObject({ payload: "l2" })
    })

    test("does not dispatch when deletedLayerId is not found in sorted list", async () => {
        const { store, dispatchedActions } = makeStore({
            layer: {
                selectedId: "l-ghost",
                allIds: ["l1"],
                items: {
                    l1: { fractionIndex: 0 },
                },
            },
        })

        store.dispatch({ type: "layer/removeLayer", payload: "l-ghost" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "layer/select")).toBeUndefined()
    })
})

describe("auto-select-on-delete listener: source branch", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("does not dispatch when deleted source is not selected", async () => {
        const { store, dispatchedActions } = makeStore({
            source: { selectedId: "s2", allIds: ["s1", "s2"] },
        })

        store.dispatch({ type: "source/removeSource", payload: "s1" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "source/select")).toBeUndefined()
    })

    test("selects next source when selected source is deleted and a next sibling exists", async () => {
        const { store, dispatchedActions } = makeStore({
            source: { selectedId: "s1", allIds: ["s1", "s2", "s3"] },
        })

        store.dispatch({ type: "source/removeSource", payload: "s1" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "source/select")
        expect(selectAction).toMatchObject({ payload: "s2" })
    })

    test("selects previous source when selected source is the last in allIds", async () => {
        const { store, dispatchedActions } = makeStore({
            source: { selectedId: "s3", allIds: ["s1", "s2", "s3"] },
        })

        store.dispatch({ type: "source/removeSource", payload: "s3" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "source/select")
        expect(selectAction).toMatchObject({ payload: "s2" })
    })

    test("selects next source when a middle source is deleted", async () => {
        const { store, dispatchedActions } = makeStore({
            source: { selectedId: "s2", allIds: ["s1", "s2", "s3"] },
        })

        store.dispatch({ type: "source/removeSource", payload: "s2" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "source/select")
        expect(selectAction).toMatchObject({ payload: "s3" })
    })

    test("does not dispatch when deletedSourceId is not found in allIds", async () => {
        const { store, dispatchedActions } = makeStore({
            source: { selectedId: "s-ghost", allIds: ["s1"] },
        })

        store.dispatch({ type: "source/removeSource", payload: "s-ghost" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "source/select")).toBeUndefined()
    })

    test("dispatches select with undefined when only one source is deleted", async () => {
        const { store, dispatchedActions } = makeStore({
            source: { selectedId: "s1", allIds: ["s1"] },
        })

        store.dispatch({ type: "source/removeSource", payload: "s1" })
        await vi.runAllTimersAsync()

        const selectAction = dispatchedActions.find(a => a.type === "source/select")
        expect(selectAction).toBeDefined()
        expect(selectAction).toMatchObject({ payload: undefined })
    })
})

import { configureStore, type Middleware } from "@reduxjs/toolkit"
import { afterEach, describe, expect, test, vi } from "vitest"
import { makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            source: {
                select: makeAction("source/select"),
                removeSource: makeAction("source/removeSource"),
            },
            selection: {
                reset: makeAction("selection/reset"),
            },
        },
    }
})

import listener from "./clear-selection-on-node-change"

type Action = { type: string; payload?: unknown }

const mvt = makeMvtSource("id", {
    sourceLayers: [
        { id: "roads", name: "Roads" },
        { id: "water", name: "Water" },
    ],
})

type TestState = {
    source: ReturnType<typeof makeSourceState>
    selection: { count: number }
}

function makeStore(selectedId: string | undefined, count: number) {
    const dispatchedActions: Action[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action as Action)
        return next(action)
    }
    const initial: TestState = {
        source: makeSourceState([mvt, makeGeojsonSource("a"), makeGeojsonSource("b")], {
            selectedIds: selectedId ? [selectedId] : [],
        }),
        selection: { count },
    }
    const reducer = (state: TestState = initial, action: Action): TestState => {
        if (action.type === "source/select") {
            return { ...state, source: { ...state.source, selectedIds: [String(action.payload)] } }
        }
        if (action.type === "source/removeSource") {
            return { ...state, source: { ...state.source, selectedIds: [] } }
        }
        return state
    }
    const store = configureStore({
        reducer,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware({ serializableCheck: false }).prepend(listener.middleware).concat(captureMiddleware),
    })
    return { store, dispatchedActions }
}

const RESET = "selection/reset"

describe("clear-selection-on-node-change listener", () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    test("resets selection when another source-layer of the same source is selected", () => {
        const { store, dispatchedActions } = makeStore("id/roads", 2)
        store.dispatch({ type: "source/select", payload: "id/water" })
        expect(dispatchedActions.some(a => a.type === RESET)).toBe(true)
    })

    test("does not reset when the same node is selected again", () => {
        const { store, dispatchedActions } = makeStore("id/roads", 2)
        store.dispatch({ type: "source/select", payload: "id/roads" })
        expect(dispatchedActions.some(a => a.type === RESET)).toBe(false)
    })

    test("does not reset when nothing is selected", () => {
        const { store, dispatchedActions } = makeStore("id/roads", 0)
        store.dispatch({ type: "source/select", payload: "id/water" })
        expect(dispatchedActions.some(a => a.type === RESET)).toBe(false)
    })

    test("resets when moving between two GeoJSON roots", () => {
        const { store, dispatchedActions } = makeStore("a", 3)
        store.dispatch({ type: "source/select", payload: "b" })
        expect(dispatchedActions.some(a => a.type === RESET)).toBe(true)
    })

    test("resets when the selected source is removed", () => {
        const { store, dispatchedActions } = makeStore("a", 3)
        store.dispatch({ type: "source/removeSource", payload: "a" })
        expect(dispatchedActions.some(a => a.type === RESET)).toBe(true)
    })
})

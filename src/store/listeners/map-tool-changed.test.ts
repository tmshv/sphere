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
            app: {
                setMapTool: makeAction("app/setMapTool"),
                setActiveSidebarTab: makeAction("app/setActiveSidebarTab"),
            },
            mapInteraction: {
                setDragPan: makeAction("mapInteraction/setDragPan"),
                setScrollZoom: makeAction("mapInteraction/setScrollZoom"),
                setDragRotate: makeAction("mapInteraction/setDragRotate"),
            },
            tools: {
                setTool: makeAction("tools/setTool"),
            },
        },
    }
})

import listener from "./map-tool-changed"

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

describe("map-tool-changed listener", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("entering draw mode resets mapTool from select to pan", async () => {
        const { store, dispatchedActions } = makeStore({
            app: { mapTool: "select" },
        })

        store.dispatch({ type: "tools/setTool", payload: "draw" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.find(a => a.type === "app/setMapTool" && a.payload === "pan")).toBeDefined()
    })

    test("entering draw mode does not dispatch if already pan", async () => {
        const { store, dispatchedActions } = makeStore({
            app: { mapTool: "pan" },
        })

        store.dispatch({ type: "tools/setTool", payload: "draw" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.filter(a => a.type === "app/setMapTool")).toHaveLength(0)
    })

    test("entering navigation mode does not reset mapTool", async () => {
        const { store, dispatchedActions } = makeStore({
            app: { mapTool: "select" },
        })

        store.dispatch({ type: "tools/setTool", payload: "navigation" })
        await vi.runAllTimersAsync()

        expect(dispatchedActions.filter(a => a.type === "app/setMapTool")).toHaveLength(0)
    })
})

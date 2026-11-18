import { afterEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { flushAsync, makeLogStore } from "@/testutils"
import { combineReducers } from "@reduxjs/toolkit"
import { actions } from "../actions"
import drawReducer from "../draw"
import selectionReducer from "../selection"
import toolsReducer from "../tools"
import listener from "./reset-tool"
import saveDraw from "./save-draw"

function makeStore(draw: object) {
    return makeLogStore({
        preloadedState: { draw, tools: { activeTool: "draw" }, selection: { count: 0, version: 0 } },
        middleware: [listener.middleware],
    })
}

describe("reset-tool listener", () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    test("cancels the draw session when the tool is reset while drawing", async () => {
        const { store, dispatched } = makeStore({ sourceId: "s1", pending: false })

        store.dispatch(actions.tools.reset())
        await flushAsync()

        expect(dispatched.map(a => a.type)).toEqual(["tools/reset", "draw/cancel"])
        expect(dispatched.find(a => a.type === "draw/cancel")?.payload).toEqual({ sourceId: "s1" })
    })

    test("does nothing when not drawing", async () => {
        const { store, dispatched } = makeStore({ pending: false })

        store.dispatch(actions.tools.reset())
        await flushAsync()

        expect(dispatched.map(a => a.type)).toEqual(["tools/reset"])
    })

    test("does not cancel while a commit or cancel is already ending the session", async () => {
        const { store, dispatched } = makeStore({ sourceId: "s1", pending: true })

        store.dispatch(actions.tools.reset())
        await flushAsync()

        expect(dispatched.map(a => a.type)).toEqual(["tools/reset"])
    })

    function makeRealStore() {
        return makeLogStore({
            preloadedState: { draw: { sourceId: "s1", pending: true }, tools: { activeTool: "draw" } },
            reducer: combineReducers({ draw: drawReducer, tools: toolsReducer }),
            middleware: [listener.middleware],
        })
    }

    test("restores the draw tool when the pending session end failed and draw mode stayed", async () => {
        const { store, dispatched } = makeRealStore()

        store.dispatch(actions.tools.reset())
        await flushAsync()
        expect(store.getState().tools.activeTool).toBe("navigation")

        store.dispatch(actions.draw.settle())
        await flushAsync()

        expect(store.getState().tools.activeTool).toBe("draw")
        expect(dispatched.map(a => a.type)).not.toContain("draw/cancel")
    })

    test("leaves the tool alone when the pending session end finished draw mode", async () => {
        const { store, dispatched } = makeRealStore()

        store.dispatch(actions.tools.reset())
        await flushAsync()
        store.dispatch(actions.draw.done({ sourceId: "s1" }))
        await flushAsync()

        expect(store.getState().tools.activeTool).toBe("navigation")
        expect(dispatched.map(a => a.type)).not.toContain("tools/setTool")
    })

    test("with the draw listeners, a tool reset rolls the backend session back", async () => {
        mockInvoke.mockImplementation((cmd: string) => Promise.resolve(cmd === "selection_get_ids" ? [] : [1]))
        // Real reducers, so the session end clears draw mode and the follow-up tool reset is a no-op
        const { store, dispatched } = makeLogStore({
            preloadedState: {
                draw: { sourceId: "s1", pending: false, hiddenIds: [3] },
                tools: { activeTool: "draw" },
                selection: { count: 0, version: 0 },
            },
            reducer: combineReducers({ draw: drawReducer, tools: toolsReducer, selection: selectionReducer }),
            middleware: [listener.middleware, saveDraw.middleware],
        })

        store.dispatch(actions.tools.reset())
        await flushAsync()

        expect(mockInvoke).toHaveBeenCalledWith("draw_rollback", { id: "s1" })
        expect(mockInvoke.mock.calls.filter(([cmd]) => cmd === "draw_rollback")).toHaveLength(1)
        expect(dispatched.filter(a => a.type === "draw/cancel")).toHaveLength(1)
        expect(store.getState().draw).toEqual({
            pending: false,
            hiddenIds: [],
            actionable: { trash: false, combineFeatures: false, uncombineFeatures: false },
        })
    })
})

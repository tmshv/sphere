import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke, log } = vi.hoisted(() => {
    const log: { current: string[] } = { current: [] }
    return { mockInvoke: vi.fn(), log }
})

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { DrawOpQueue, registerDrawQueue } from "@/lib/draw-session"
import { flushAsync, makeGeojsonSource, makeLogStore } from "@/testutils"
import { type Reducer, combineReducers } from "@reduxjs/toolkit"
import { actions } from "../actions"
import drawReducer from "../draw"
import listener from "./exit-draw-on-source-delete"

function mockCommands(rollback: () => Promise<unknown> = () => Promise.resolve([1])) {
    mockInvoke.mockImplementation((cmd: string) => {
        log.current.push(`invoke:${cmd}`)
        if (cmd === "draw_rollback") return rollback()
        if (cmd === "selection_get_ids") return Promise.resolve([])
        return Promise.resolve(null)
    })
}

const SELECTION = { count: 0, version: 0 }

// The identity reducer keeps `source.items` as seeded, so a source left out of it reads as just removed
function makeStore(draw: object, items: Record<string, object>) {
    const result = makeLogStore({
        preloadedState: { draw, source: { items }, selection: SELECTION },
        middleware: [listener.middleware],
    })
    log.current = result.log
    return result
}

function types(dispatched: { type: string }[]) {
    return dispatched.map(a => a.type)
}

const cleanups: (() => void)[] = []

describe("exit-draw-on-source-delete listener", () => {
    beforeEach(() => {
        mockCommands()
    })

    afterEach(() => {
        for (const cleanup of cleanups.splice(0)) cleanup()
        vi.clearAllMocks()
    })

    test("leaves draw mode and rolls the session back when the drawn source is removed", async () => {
        const { store, log } = makeStore({ sourceId: "s1", pending: false }, {})
        const queue = new DrawOpQueue("s1", () => {})
        cleanups.push(registerDrawQueue(queue))
        queue.enqueue([{ type: "delete", id: 3 }])

        store.dispatch(actions.source.removeSource("s1"))
        await flushAsync()

        expect(log).toEqual([
            "action:source/removeSource",
            "action:draw/reset",
            "action:tools/reset",
            "invoke:draw_apply",
            "invoke:draw_rollback",
            "action:source/bumpVersion",
            "invoke:selection_get_ids",
            "action:selection/sync",
            "action:selection/apply",
        ])
        expect(mockInvoke).toHaveBeenCalledWith("draw_rollback", { id: "s1" })
    })

    test("a rollback error is surfaced; draw mode is left anyway since the source is gone", async () => {
        mockCommands(() => Promise.reject("rollback exploded"))
        const { store, dispatched } = makeStore({ sourceId: "s1", pending: false }, {})

        store.dispatch(actions.source.removeSource("s1"))
        await flushAsync()

        expect(types(dispatched)).toEqual(["source/removeSource", "draw/reset", "tools/reset", "error/setError"])
        expect(dispatched.find(a => a.type === "error/setError")?.payload).toEqual(
            expect.stringContaining("rollback exploded"),
        )
    })

    test("does nothing when the drawn source is still there", async () => {
        const { store, dispatched } = makeStore({ sourceId: "s2", pending: false }, { s2: makeGeojsonSource("s2") })

        store.dispatch(actions.source.removeSource("s1"))
        await flushAsync()

        expect(types(dispatched)).toEqual(["source/removeSource"])
        expect(mockInvoke).not.toHaveBeenCalled()
    })

    test("does nothing when draw is not active", async () => {
        const { store, dispatched } = makeStore({ pending: false }, {})

        store.dispatch(actions.source.removeSource("s1"))
        await flushAsync()

        expect(types(dispatched)).toEqual(["source/removeSource"])
    })

    test("waits for a pending commit or cancel to settle, then rolls back what it left open", async () => {
        const sourceReducer: Reducer = (s: object = { items: {} }) => s
        const selectionReducer: Reducer = (s: object = SELECTION) => s
        const toolsReducer: Reducer = (s: object = {}) => s
        const { store, dispatched } = makeLogStore({
            preloadedState: { draw: { sourceId: "s1", pending: true }, source: { items: {} }, selection: SELECTION },
            reducer: combineReducers({
                draw: drawReducer,
                source: sourceReducer,
                selection: selectionReducer,
                tools: toolsReducer,
            }),
            middleware: [listener.middleware],
        })

        store.dispatch(actions.source.removeSource("s1"))
        await flushAsync()
        expect(mockInvoke).not.toHaveBeenCalled()

        // The commit failed: the session is still open
        store.dispatch(actions.draw.settle())
        await flushAsync()

        expect(mockInvoke).toHaveBeenCalledWith("draw_rollback", { id: "s1" })
        expect(types(dispatched)).toContain("draw/reset")
    })

    test("does not roll back when the pending end finished the session", async () => {
        const sourceReducer: Reducer = (s: object = { items: {} }) => s
        const { store } = makeLogStore({
            preloadedState: { draw: { sourceId: "s1", pending: true }, source: { items: {} } },
            reducer: combineReducers({ draw: drawReducer, source: sourceReducer }),
            middleware: [listener.middleware],
        })

        store.dispatch(actions.source.removeSource("s1"))
        await flushAsync()
        store.dispatch(actions.draw.done({ sourceId: "s1" }))
        await flushAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
    })
})

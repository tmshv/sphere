import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke, log } = vi.hoisted(() => {
    const log: { current: string[] } = { current: [] }
    return { mockInvoke: vi.fn(), log }
})

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { DrawOpQueue, registerDrawQueue } from "@/lib/draw-session"
import drawReducer, { type DrawState } from "@/store/draw"
import { type Middleware, combineReducers } from "@reduxjs/toolkit"
import { onSelectionReconcile } from "@/lib/selection-bus"
import { flushAsync, makeLogStore } from "@/testutils"
import { actions } from "../actions"
import listener from "./save-draw"

const SOURCE_ID = "s1"

type Responses = Record<string, () => Promise<unknown>>

const ok = (value: unknown) => () => Promise.resolve(value)
const fail = (message: string) => () => Promise.reject(message)

function mockCommands(overrides: Responses = {}) {
    const responses: Responses = {
        draw_apply: ok(null),
        draw_commit: ok([1, 2]),
        draw_rollback: ok([1]),
        selection_get_ids: ok([2]),
        ...overrides,
    }
    mockInvoke.mockImplementation((cmd: string) => {
        log.current.push(`invoke:${cmd}`)
        const respond = responses[cmd]
        return respond ? respond() : Promise.reject(`unexpected command ${cmd}`)
    })
}

function makeStore(draw: object = { sourceId: SOURCE_ID, pending: false }) {
    const result = makeLogStore({
        preloadedState: { draw, selection: { count: 2, version: 0, sourceId: SOURCE_ID } },
        middleware: [listener.middleware],
    })
    log.current = result.log
    return result
}

const cleanups: (() => void)[] = []

function registerQueueWithOneOp() {
    const queue = new DrawOpQueue(SOURCE_ID, () => {})
    cleanups.push(registerDrawQueue(queue))
    queue.enqueue([{ type: "delete", id: 9 }])
    return queue
}

function types(dispatched: { type: string }[]) {
    return dispatched.map(a => a.type)
}

describe("save-draw listener: commit", () => {
    beforeEach(() => {
        mockCommands()
    })

    afterEach(() => {
        for (const cleanup of cleanups.splice(0)) cleanup()
        vi.clearAllMocks()
    })

    test("flushes, commits, bumps the version, leaves draw mode, then refreshes the selection", async () => {
        const { store, log } = makeStore()
        const reconciled: { ids: number[]; sourceId: string }[] = []
        cleanups.push(onSelectionReconcile(payload => reconciled.push(payload)))
        registerQueueWithOneOp()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(log).toEqual([
            "action:draw/commit",
            "invoke:draw_apply",
            "invoke:draw_commit",
            "action:source/bumpVersion",
            "action:draw/done",
            "action:tools/reset",
            "invoke:selection_get_ids",
            "action:selection/sync",
            "action:selection/apply",
        ])
        expect(reconciled).toEqual([{ ids: [2], sourceId: SOURCE_ID }])
        expect(mockInvoke).toHaveBeenCalledWith("draw_commit", { id: SOURCE_ID })
    })

    test("does not commit until an in-flight op has landed", async () => {
        let landOp: (value: unknown) => void = () => {}
        mockCommands({
            draw_apply: () =>
                new Promise(resolve => {
                    landOp = resolve
                }),
        })
        const { store } = makeStore()
        registerQueueWithOneOp()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()
        expect(mockInvoke).not.toHaveBeenCalledWith("draw_commit", expect.anything())

        landOp(null)
        await flushAsync()
        expect(mockInvoke).toHaveBeenCalledWith("draw_commit", { id: SOURCE_ID })
    })

    test("passes the source id and the refreshed count", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(dispatched.find(a => a.type === "source/bumpVersion")?.payload).toBe(SOURCE_ID)
        expect(dispatched.find(a => a.type === "selection/sync")?.payload).toEqual({ count: 1, sourceId: SOURCE_ID })
        expect(dispatched.find(a => a.type === "draw/done")?.payload).toEqual({ sourceId: SOURCE_ID })
    })

    test("does not commit when the op queue failed: error surfaced, still in draw mode", async () => {
        const { store, dispatched } = makeStore()
        const queue = new DrawOpQueue(SOURCE_ID, () => {})
        cleanups.push(registerDrawQueue(queue))
        queue.fail("draw_apply rejected")

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(mockInvoke).not.toHaveBeenCalledWith("draw_commit", expect.anything())
        expect(types(dispatched)).toEqual(["draw/commit", "error/setError", "draw/settle"])
        const error = dispatched.find(a => a.type === "error/setError")?.payload
        expect(error).toEqual(expect.stringContaining("draw_apply rejected"))
    })

    test("stays in draw mode and surfaces the error when draw_commit fails", async () => {
        mockCommands({ draw_commit: fail("commit exploded") })
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(types(dispatched)).toEqual(["draw/commit", "error/setError", "draw/settle"])
        expect(dispatched.find(a => a.type === "error/setError")?.payload).toEqual(
            expect.stringContaining("commit exploded"),
        )
    })

    test("still leaves draw mode when only the selection refresh fails, and surfaces it", async () => {
        mockCommands({ selection_get_ids: fail("selection gone") })
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(types(dispatched)).toEqual([
            "draw/commit",
            "source/bumpVersion",
            "draw/done",
            "tools/reset",
            "error/setError",
        ])
    })

    test("does not ask for a re-fetch when the commit touched nothing", async () => {
        mockCommands({ draw_commit: ok([]) })
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(types(dispatched)).toEqual([
            "draw/commit",
            "draw/done",
            "tools/reset",
            "selection/sync",
            "selection/apply",
        ])
    })

    test("ignores a commit for a source that is not being drawn", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.commit({ sourceId: "other" }))
        await flushAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
        expect(types(dispatched)).toEqual(["draw/commit"])
    })

    test("ignores a second commit while the session end is pending", async () => {
        const { store } = makeStore({ sourceId: SOURCE_ID, pending: true })

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
    })
})

describe("save-draw listener: cancel", () => {
    beforeEach(() => {
        mockCommands()
    })

    afterEach(() => {
        for (const cleanup of cleanups.splice(0)) cleanup()
        vi.clearAllMocks()
    })

    test("lets in-flight ops land, rolls back, leaves draw mode, then refreshes the selection", async () => {
        const { store, log } = makeStore()
        registerQueueWithOneOp()

        store.dispatch(actions.draw.cancel({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(log).toEqual([
            "action:draw/cancel",
            "invoke:draw_apply",
            "invoke:draw_rollback",
            "action:draw/reset",
            "action:tools/reset",
            "invoke:selection_get_ids",
            "action:selection/sync",
            "action:selection/apply",
        ])
        expect(mockInvoke).toHaveBeenCalledWith("draw_rollback", { id: SOURCE_ID })
    })

    // The rollback restores what the map's copy of the source already shows: nothing to re-fetch
    test("does not ask for a re-fetch of the source", async () => {
        const { store, dispatched } = makeStore()
        registerQueueWithOneOp()

        store.dispatch(actions.draw.cancel({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(types(dispatched)).not.toContain("source/bumpVersion")
    })

    test("rolls back even when the op queue failed", async () => {
        const { store } = makeStore()
        const queue = new DrawOpQueue(SOURCE_ID, () => {})
        cleanups.push(registerDrawQueue(queue))
        queue.fail("boom")

        store.dispatch(actions.draw.cancel({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(mockInvoke).toHaveBeenCalledWith("draw_rollback", { id: SOURCE_ID })
    })

    test("surfaces a rollback error and stays in draw mode", async () => {
        mockCommands({ draw_rollback: fail("rollback exploded") })
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.cancel({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(types(dispatched)).toEqual(["draw/cancel", "error/setError", "draw/settle"])
        expect(dispatched.find(a => a.type === "error/setError")?.payload).toEqual(
            expect.stringContaining("rollback exploded"),
        )
    })

    test("ignores a cancel for a source that is not being drawn", async () => {
        const { store } = makeStore({ pending: false })

        store.dispatch(actions.draw.cancel({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
    })
})

describe("save-draw listener: failed", () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    test("surfaces a draw error reported by the map", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.failed("load exploded"))
        await flushAsync()

        expect(dispatched.find(a => a.type === "error/setError")?.payload).toEqual(
            expect.stringContaining("load exploded"),
        )
    })
})

describe("save-draw listener: hidden ids", () => {
    beforeEach(() => {
        mockCommands()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    // The real draw reducer, so the test sees when the hidden ids clear
    function makeHiddenStore() {
        const hiddenAtBump: number[][] = []
        const watchBump: Middleware<object, { draw: DrawState }> = api => next => action => {
            if (actions.source.bumpVersion.match(action)) {
                hiddenAtBump.push(api.getState().draw.hiddenIds)
            }
            return next(action)
        }
        const { store } = makeLogStore({
            preloadedState: {
                draw: { sourceId: SOURCE_ID, pending: false, hiddenIds: [4, 5] },
                selection: { count: 0, version: 0, sourceId: SOURCE_ID },
            },
            reducer: combineReducers({ draw: drawReducer, selection: (state: object = {}) => state }),
            middleware: [listener.middleware, watchBump],
        })
        return { store, hiddenAtBump }
    }

    test("commit clears the hidden ids only after the re-fetch was asked for", async () => {
        const { store, hiddenAtBump } = makeHiddenStore()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(hiddenAtBump).toEqual([[4, 5]])
        expect(store.getState().draw.hiddenIds).toEqual([])
    })

    test("cancel clears the hidden ids without a re-fetch", async () => {
        const { store, hiddenAtBump } = makeHiddenStore()

        store.dispatch(actions.draw.cancel({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(hiddenAtBump).toEqual([])
        expect(store.getState().draw.hiddenIds).toEqual([])
    })

    test("a failed commit keeps the hidden ids: the session is still open", async () => {
        mockCommands({ draw_commit: fail("commit exploded") })
        const { store } = makeHiddenStore()

        store.dispatch(actions.draw.commit({ sourceId: SOURCE_ID }))
        await flushAsync()

        expect(store.getState().draw).toEqual({ sourceId: SOURCE_ID, pending: false, hiddenIds: [4, 5] })
    })
})

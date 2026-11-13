import { afterEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { flushAsync, makeLogStore } from "@/testutils"
import { actions } from "../actions"
import listener from "./start-draw"

function makeStore(draw: object = { pending: false }) {
    return makeLogStore({ preloadedState: { draw }, middleware: [listener.middleware] })
}

function types(dispatched: { type: string }[]) {
    return dispatched.map(a => a.type)
}

describe("start-draw listener", () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    test("begins the backend session, then enters draw mode", async () => {
        mockInvoke.mockResolvedValue(undefined)
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.start({ sourceId: "s1" }))
        await flushAsync()

        expect(mockInvoke).toHaveBeenCalledWith("draw_begin", { id: "s1" })
        expect(types(dispatched)).toEqual(["draw/start", "draw/started", "tools/setTool"])
        expect(dispatched.find(a => a.type === "draw/started")?.payload).toEqual({ sourceId: "s1" })
        expect(dispatched.find(a => a.type === "tools/setTool")?.payload).toBe("draw")
    })

    test("fails closed on a source that cannot be edited: error surfaced, not in draw mode", async () => {
        mockInvoke.mockRejectedValue("Source s1 is not an in-memory source")
        const { store, dispatched } = makeStore()

        store.dispatch(actions.draw.start({ sourceId: "s1" }))
        await flushAsync()

        expect(types(dispatched)).toEqual(["draw/start", "error/setError", "draw/settle"])
        expect(dispatched.find(a => a.type === "error/setError")?.payload).toEqual(
            expect.stringContaining("not an in-memory source"),
        )
    })

    test("does nothing while already drawing", async () => {
        const { store, dispatched } = makeStore({ sourceId: "s0", pending: false })

        store.dispatch(actions.draw.start({ sourceId: "s1" }))
        await flushAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
        expect(types(dispatched)).toEqual(["draw/start"])
    })

    test("does nothing while another begin is pending", async () => {
        const { store } = makeStore({ pending: true })

        store.dispatch(actions.draw.start({ sourceId: "s1" }))
        await flushAsync()

        expect(mockInvoke).not.toHaveBeenCalled()
    })
})

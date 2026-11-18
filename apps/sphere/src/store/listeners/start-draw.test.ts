import { afterEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { flushAsync, makeGeojsonSource, makeLogStore } from "@/testutils"
import { actions } from "../actions"
import listener from "./start-draw"

// The identity reducer keeps `source.items` as seeded: leave a source out to have it removed during the begin
function makeStore(draw: object = { pending: false }, items: Record<string, object> = { s1: makeGeojsonSource("s1") }) {
    return makeLogStore({ preloadedState: { draw, source: { items } }, middleware: [listener.middleware] })
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

    test("rolls the session back without entering draw mode when the source was removed during the begin", async () => {
        mockInvoke.mockResolvedValue(undefined)
        const { store, dispatched } = makeStore({ pending: false }, {})

        store.dispatch(actions.draw.start({ sourceId: "s1" }))
        await flushAsync()

        expect(mockInvoke.mock.calls.map(([cmd]) => cmd)).toEqual(["draw_begin", "draw_rollback"])
        expect(types(dispatched)).toEqual(["draw/start", "draw/settle"])
    })

    test("surfaces a failed rollback of a session on a removed source", async () => {
        mockInvoke.mockImplementation((cmd: string) =>
            cmd === "draw_rollback" ? Promise.reject("rollback exploded") : Promise.resolve(undefined),
        )
        const { store, dispatched } = makeStore({ pending: false }, {})

        store.dispatch(actions.draw.start({ sourceId: "s1" }))
        await flushAsync()

        expect(types(dispatched)).toEqual(["draw/start", "error/setError", "draw/settle"])
        expect(dispatched.find(a => a.type === "error/setError")?.payload).toEqual(
            expect.stringContaining("rollback exploded"),
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

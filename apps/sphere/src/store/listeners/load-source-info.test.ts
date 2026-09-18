import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { makeCaptureStore } from "@/testutils"
import { actions } from "../actions"
import listener from "./load-source-info"

const info = {
    file: { size_bytes: 10, modified: null },
    schema: { columns: { alpha: "String", beta: "Number" }, points_count: 1 },
    details: { format: "geojson" },
}

const statsFor = (column: string) => ({
    column,
    col_type: "String",
    count: 1,
    null_count: 0,
})

const flush = async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
}

function makeStore(preloadedState: object = { sourceInfo: { info: {}, stats: {} } }) {
    return makeCaptureStore({ preloadedState, middleware: listener.middleware })
}

describe("load-source-info listener", () => {
    beforeEach(() => {
        mockInvoke.mockReset()
        mockInvoke.mockImplementation((cmd: string, args: { column?: string }) => {
            if (cmd === "source_get_info") return Promise.resolve(info)
            if (cmd === "source_get_column_stats") return Promise.resolve(statsFor(args.column ?? ""))
            return Promise.resolve(null)
        })
    })

    test("fetches info then one stats call per column", async () => {
        const { store } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()

        const commands = mockInvoke.mock.calls.map(call => call[0])
        expect(commands.filter(c => c === "source_get_info")).toHaveLength(1)
        expect(commands.filter(c => c === "source_get_column_stats")).toHaveLength(2)
    })

    test("dispatches each stats result as it arrives, in column order", async () => {
        const { store, dispatched } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()

        const received = dispatched
            .filter(a => a.type === "sourceInfo/statsReceived")
            .map(a => (a.payload as { column: string }).column)
        expect(received).toEqual(["alpha", "beta"])
    })

    test("skips columns already cached for that source", async () => {
        const { store } = makeStore({
            sourceInfo: {
                info: {},
                stats: { s1: { alpha: { status: "ready", data: statsFor("alpha") } } },
            },
        })

        store.dispatch(actions.source.select("s1"))
        await flush()

        const statsColumns = mockInvoke.mock.calls
            .filter(call => call[0] === "source_get_column_stats")
            .map(call => (call[1] as { column: string }).column)
        expect(statsColumns).toEqual(["beta"])
    })

    test("stops issuing stats calls once a newer selection cancels the run", async () => {
        const { store } = makeStore()

        store.dispatch(actions.source.select("s1"))
        store.dispatch(actions.source.select("s2"))
        await flush()

        const infoIds = mockInvoke.mock.calls
            .filter(call => call[0] === "source_get_info")
            .map(call => (call[1] as { id: string }).id)
        expect(infoIds).toContain("s2")
    })

    test("dispatches infoFailed and issues no stats calls when info fails", async () => {
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === "source_get_info") return Promise.reject(new Error("boom"))
            return Promise.resolve(null)
        })
        const { store, dispatched } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()

        expect(dispatched.some(a => a.type === "sourceInfo/infoFailed")).toBe(true)
        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_column_stats")).toBe(false)
    })

    test("reloads info when the selected source's version is bumped", async () => {
        const { store } = makeStore({
            source: { selectedId: "s1" },
            sourceInfo: { info: {}, stats: {} },
        })

        store.dispatch(actions.source.bumpVersion("s1"))
        await flush()

        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_info")).toBe(true)
    })

    test("does not reload when a background source's version is bumped", async () => {
        const { store } = makeStore({
            source: { selectedId: "s1" },
            sourceInfo: { info: {}, stats: {} },
        })

        store.dispatch(actions.source.bumpVersion("s2"))
        await flush()

        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_info")).toBe(false)
    })
})

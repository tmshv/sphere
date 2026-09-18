import { beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { makeCaptureStore } from "@/testutils"
import { SourceType } from "@/types"
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

type StoreOptions = {
    selectedId?: string
    items?: Record<string, { type: SourceType }>
    stats?: Record<string, Record<string, { status: string; data?: unknown }>>
}

function makeStore(options: StoreOptions = {}) {
    const items = options.items ?? {}
    return makeCaptureStore({
        preloadedState: {
            source: { items, allIds: Object.keys(items), selectedId: options.selectedId },
            sourceInfo: { info: {}, stats: options.stats ?? {} },
        },
        middleware: listener.middleware,
    })
}

function callAt(calls: StatsCall[], index: number): StatsCall {
    const call = calls.at(index)
    if (!call) throw new Error(`expected a pending stats call at index ${index}`)
    return call
}

type StatsCall = {
    id: string
    column: string
    resolve: (stats: ReturnType<typeof statsFor>) => void
}

// Installs a `source_get_column_stats` mock that never resolves on its own: each
// call is recorded (with the id/column it was made for and its own resolver) and
// left pending until the test resolves it explicitly. This is what makes it
// possible to prove ordering (does call N+1 wait for call N to resolve?) and
// cancellation (does a stale run stop issuing calls once superseded?) rather than
// just asserting a final call count, which both a sequential and a parallel
// implementation would satisfy identically.
function deferColumnStats(infoData: typeof info = info): StatsCall[] {
    const calls: StatsCall[] = []
    mockInvoke.mockImplementation((cmd: string, args: { id?: string; column?: string }) => {
        if (cmd === "source_get_info") return Promise.resolve(infoData)
        if (cmd === "source_get_column_stats") {
            return new Promise<ReturnType<typeof statsFor>>(resolve => {
                calls.push({ id: args.id ?? "", column: args.column ?? "", resolve })
            })
        }
        return Promise.resolve(null)
    })
    return calls
}

const infoWithThreeColumns = {
    file: { size_bytes: 10, modified: null },
    schema: { columns: { alpha: "String", beta: "Number", gamma: "String" }, points_count: 1 },
    details: { format: "geojson" },
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
        const calls = deferColumnStats()
        const { store } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()

        // Only the first column's stats call has been issued, and it is still
        // pending. Promise.all would have issued both columns' calls up front,
        // so this is where a switch to Promise.all would be caught.
        expect(calls).toHaveLength(1)
        expect(calls[0].column).toBe("alpha")

        calls[0].resolve(statsFor("alpha"))
        await flush()

        // Only now, after the first call settled, does the second appear.
        expect(calls).toHaveLength(2)
        expect(calls[1].column).toBe("beta")
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
        const { store } = makeStore({ stats: { s1: { alpha: { status: "ready", data: statsFor("alpha") } } } })

        store.dispatch(actions.source.select("s1"))
        await flush()

        const statsColumns = mockInvoke.mock.calls
            .filter(call => call[0] === "source_get_column_stats")
            .map(call => (call[1] as { column: string }).column)
        expect(statsColumns).toEqual(["beta"])
    })

    test("stops issuing stats calls once a newer selection cancels the run", async () => {
        const calls = deferColumnStats(infoWithThreeColumns)
        const { store } = makeStore()

        store.dispatch(actions.source.select("s1"))
        await flush()
        expect(calls).toHaveLength(1) // s1/alpha requested and pending

        calls[0].resolve(statsFor("alpha"))
        await flush()
        expect(calls).toHaveLength(2) // s1/beta requested and pending

        // A newer selection arrives while s1's run is still mid-column.
        store.dispatch(actions.source.select("s2"))
        await flush()

        const s1CallsBeforeBetaSettles = calls.filter(c => c.id === "s1")
        expect(s1CallsBeforeBetaSettles).toHaveLength(2)

        // Resolve s1's still-pending "beta" call. If cancellation had not taken
        // effect, the loop would resume and go on to request "gamma".
        const s1Beta = calls.find(c => c.id === "s1" && c.column === "beta")
        if (!s1Beta) throw new Error("expected a pending stats call for s1/beta")
        s1Beta.resolve(statsFor("beta"))
        await flush()

        const s1CallsAfterBetaSettles = calls.filter(c => c.id === "s1")
        expect(s1CallsAfterBetaSettles).toHaveLength(2)
        expect(s1CallsAfterBetaSettles.length).toBeLessThan(3)
        expect(s1CallsAfterBetaSettles.map(c => c.column)).not.toContain("gamma")
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
        const { store } = makeStore({ selectedId: "s1" })

        store.dispatch(actions.source.bumpVersion("s1"))
        await flush()

        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_info")).toBe(true)
    })

    test("does not reload when a background source's version is bumped", async () => {
        const { store } = makeStore({ selectedId: "s1" })

        store.dispatch(actions.source.bumpVersion("s2"))
        await flush()

        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_info")).toBe(false)
    })

    // The CSV re-parse flow drives `select` and `bumpVersion` against the same
    // id: the run started by `select` is still awaiting stats computed against
    // the pre-rebuild store when the rebuild finishes. While the two triggers
    // lived in separate registrations, `cancelActiveListeners()` could not reach
    // across them, and the stale answer landed on top of the fresh one.
    test("a run superseded by a bumpVersion for the same id cannot write its stats", async () => {
        const calls = deferColumnStats()
        const { store, dispatched } = makeStore({ selectedId: "s1" })

        store.dispatch(actions.source.select("s1"))
        await flush()
        expect(calls).toHaveLength(1) // the pre-rebuild request, still pending

        store.dispatch(actions.source.bumpVersion("s1"))
        await flush()
        expect(calls).toHaveLength(2) // the rebuild's own request

        callAt(calls, 1).resolve({ ...statsFor("alpha"), count: 2 })
        await flush()

        // The pre-rebuild request finally answers, with the old numbers.
        callAt(calls, 0).resolve({ ...statsFor("alpha"), count: 1 })
        await flush()

        const received = dispatched.filter(a => a.type === "sourceInfo/statsReceived")
        expect(received).toHaveLength(1)
        expect(received.at(0)?.payload).toMatchObject({ column: "alpha", stats: { count: 2 } })
    })

    test("stops the scan when the source being scanned is removed", async () => {
        const calls = deferColumnStats(infoWithThreeColumns)
        const { store, dispatched } = makeStore({ selectedId: "s1" })

        store.dispatch(actions.source.select("s1"))
        await flush()
        expect(calls).toHaveLength(1)

        store.dispatch(actions.source.removeSource("s1"))
        await flush()

        const invalidateAt = dispatched.findIndex(a => a.type === "sourceInfo/invalidate")
        expect(invalidateAt).toBeGreaterThanOrEqual(0)

        // The in-flight request answers after the source is gone.
        callAt(calls, 0).resolve(statsFor("alpha"))
        await flush()

        expect(calls).toHaveLength(1) // no further column was requested
        const afterInvalidate = dispatched.slice(invalidateAt)
        expect(afterInvalidate.some(a => a.type.startsWith("sourceInfo/stats"))).toBe(false)
    })

    test("keeps scanning when a different source is removed", async () => {
        const calls = deferColumnStats(infoWithThreeColumns)
        const { store } = makeStore({ selectedId: "s1" })

        store.dispatch(actions.source.select("s1"))
        await flush()

        store.dispatch(actions.source.removeSource("s2"))
        await flush()

        callAt(calls, 0).resolve(statsFor("alpha"))
        await flush()

        expect(calls).toHaveLength(2)
    })

    test("loads no info for a vector tile source", async () => {
        const { store, dispatched } = makeStore({ items: { t1: { type: SourceType.MVT } } })

        store.dispatch(actions.source.select("t1"))
        await flush()

        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_info")).toBe(false)
        expect(dispatched.some(a => a.type === "sourceInfo/infoFailed")).toBe(false)
    })

    test("loads no info for a raster tile source", async () => {
        const { store } = makeStore({ items: { t1: { type: SourceType.Raster } } })

        store.dispatch(actions.source.select("t1"))
        await flush()

        expect(mockInvoke.mock.calls.some(call => call[0] === "source_get_info")).toBe(false)
    })
})

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const { mockInvoke, log } = vi.hoisted(() => {
    const log: { current: string[] } = { current: [] }
    return { mockInvoke: vi.fn(), log }
})

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }))
vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { DrawOpQueue, registerDrawQueue } from "@/lib/draw-session"
import { onSelectionDelta, onSelectionReconcile } from "@/lib/selection-bus"
import type { SelectionDelta } from "@/lib/selection-ipc"
import { flushAsync, makeLogStore } from "@/testutils"
import type { DrawFeatureId } from "@/types"
import { actions } from "../actions"
import listener from "./draw-selection"

const SOURCE_ID = "s1"
const CREATED_BACKEND_ID = 100
const POINT: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } }

type Responses = Record<string, (args: Record<string, unknown>) => Promise<unknown>>

function deferred<T>() {
    let resolve: (v: T) => void = () => {}
    const promise = new Promise<T>(res => {
        resolve = res
    })
    return { promise, resolve }
}

function delta(added: number[], removed: number[] = []): SelectionDelta {
    return { added, removed }
}

function mockCommands(overrides: Responses = {}) {
    const responses: Responses = {
        draw_apply: () => Promise.resolve(CREATED_BACKEND_ID),
        selection_set: args => Promise.resolve(delta(Array.isArray(args.ids) ? args.ids : [])),
        ...overrides,
    }
    mockInvoke.mockImplementation((cmd: string, args: Record<string, unknown> = {}) => {
        log.current.push(`invoke:${cmd}`)
        const respond = responses[cmd]
        return respond ? respond(args) : Promise.reject(`unexpected command ${cmd}`)
    })
}

const cleanups: (() => void)[] = []

function setup(draw: object = { sourceId: SOURCE_ID, pending: false }) {
    const result = makeLogStore({
        preloadedState: { draw, selection: { count: 0, version: 0 } },
        middleware: [listener.middleware],
    })
    // A new session forgets what the last one mirrored
    result.store.dispatch(actions.draw.started({ sourceId: SOURCE_ID }))
    result.log.length = 0
    result.dispatched.length = 0
    log.current = result.log
    const deltas: SelectionDelta[] = []
    const reconciled: { ids: number[]; sourceId: string }[] = []
    cleanups.push(
        onSelectionDelta(d => {
            deltas.push(d)
            log.current.push("emit:delta")
        }),
    )
    cleanups.push(
        onSelectionReconcile(payload => {
            reconciled.push(payload)
            log.current.push("emit:reconcile")
        }),
    )
    const queue = new DrawOpQueue(SOURCE_ID, () => {})
    cleanups.push(registerDrawQueue(queue))
    return { ...result, deltas, reconciled, queue }
}

function change(ids: DrawFeatureId[], sourceId = SOURCE_ID) {
    return actions.draw.selectionChanged({ sourceId, ids })
}

function setCalls(): unknown[] {
    return mockInvoke.mock.calls.filter(([cmd]) => cmd === "selection_set").map(([, args]) => args)
}

describe("draw-selection listener", () => {
    beforeEach(() => {
        mockCommands()
    })

    afterEach(() => {
        for (const cleanup of cleanups.splice(0)) cleanup()
        vi.clearAllMocks()
    })

    test("flushes the edit queue, sends the backend ids, emits the delta, then syncs and applies", async () => {
        const { store, log, dispatched, deltas, queue } = setup()
        queue.enqueue([{ type: "create", drawId: "draw-a", feature: POINT }])

        store.dispatch(change([4, "draw-a"]))
        await flushAsync()

        expect(log).toEqual([
            "action:draw/selectionChanged",
            "invoke:draw_apply",
            "invoke:selection_set",
            "emit:delta",
            "action:selection/sync",
            "action:selection/apply",
        ])
        expect(setCalls()).toEqual([{ ids: [4, CREATED_BACKEND_ID] }])
        expect(deltas).toEqual([delta([4, CREATED_BACKEND_ID])])
        expect(dispatched.find(a => a.type === "selection/sync")?.payload).toEqual({ count: 2, sourceId: SOURCE_ID })
    })

    test("latest wins: an older change whose IPC resolves after a newer one started emits nothing", async () => {
        const first = deferred<SelectionDelta>()
        let calls = 0
        mockCommands({
            selection_set: args => {
                calls += 1
                return calls === 1 ? first.promise : Promise.resolve(delta(Array.isArray(args.ids) ? args.ids : []))
            },
        })
        const { store, dispatched, deltas, reconciled } = setup()

        store.dispatch(change([1]))
        await flushAsync()
        store.dispatch(change([2]))
        await flushAsync()
        // The newer change waits for the older request: the backend applies them in order
        expect(setCalls()).toEqual([{ ids: [1] }])

        first.resolve(delta([1], [7]))
        await flushAsync()

        expect(setCalls()).toEqual([{ ids: [1] }, { ids: [2] }])
        expect(deltas).toEqual([delta([2])])
        // The older delta was dropped, so the newer one restates the whole selection
        expect(reconciled).toEqual([{ ids: [2], sourceId: SOURCE_ID }])
        expect(dispatched.filter(a => a.type === "selection/sync").map(a => a.payload)).toEqual([
            { count: 1, sourceId: SOURCE_ID },
        ])
    })

    test("a change superseded before it was sent sends nothing", async () => {
        const { store, deltas } = setup()

        store.dispatch(change([1]))
        store.dispatch(change([2]))
        await flushAsync()

        expect(setCalls()).toEqual([{ ids: [2] }])
        expect(deltas).toEqual([delta([2])])
    })

    test("a failed flush surfaces nothing new and does not touch the selection", async () => {
        mockCommands({ draw_apply: () => Promise.reject("boom") })
        const { store, dispatched, queue } = setup()
        queue.enqueue([{ type: "delete", id: 9 }])

        store.dispatch(change([1]))
        await flushAsync()

        expect(setCalls()).toEqual([])
        expect(dispatched.map(a => a.type)).toEqual(["draw/selectionChanged"])
    })

    test("a created feature whose backend id is unknown is not sent as a string", async () => {
        const { store } = setup()

        store.dispatch(change([1, "draw-unknown"]))
        await flushAsync()

        expect(setCalls()).toEqual([{ ids: [1] }])
    })

    test("vertices are not mirrored: a change with the feature ids last sent is skipped", async () => {
        const { store } = setup()

        store.dispatch(change([1, 2]))
        await flushAsync()
        store.dispatch(change([2, 1]))
        await flushAsync()

        expect(setCalls()).toEqual([{ ids: [1, 2] }])
    })

    test("the same ids are sent again once the selection changed elsewhere", async () => {
        const { store } = setup()

        store.dispatch(change([1]))
        await flushAsync()
        store.dispatch(actions.selection.sync({ count: 3, sourceId: SOURCE_ID }))
        store.dispatch(change([1]))
        await flushAsync()

        expect(setCalls()).toEqual([{ ids: [1] }, { ids: [1] }])
    })

    test("a cleared selection is followed too", async () => {
        const { store } = setup()

        store.dispatch(change([1]))
        await flushAsync()
        store.dispatch(actions.selection.reset())
        store.dispatch(change([1]))
        await flushAsync()

        expect(setCalls()).toEqual([{ ids: [1] }, { ids: [1] }])
    })

    test("ignores a change on a source that is not being drawn", async () => {
        const { store } = setup()

        store.dispatch(change([1], "other"))
        await flushAsync()

        expect(setCalls()).toEqual([])
    })

    test("a failed selection_set is surfaced", async () => {
        mockCommands({ selection_set: () => Promise.reject("ipc down") })
        const { store, dispatched, deltas } = setup()

        store.dispatch(change([1]))
        await flushAsync()

        expect(deltas).toEqual([])
        expect(dispatched.map(a => a.type)).toContain("error/setError")
        expect(dispatched.map(a => a.type)).not.toContain("selection/sync")
    })
})

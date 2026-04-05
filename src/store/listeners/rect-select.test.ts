import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const invokeMock = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
    invoke: (...args: unknown[]) => invokeMock(...args),
}))

vi.mock("@/map", () => ({
    getMap: () => ({
        getContainer: () => ({
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        }),
        unproject: ([x, y]: [number, number]) => ({ lng: x / 100, lat: y / 100 }),
    }),
}))

vi.mock("@/lib/selection-bus", () => ({
    emitSelectionDelta: vi.fn(),
}))

vi.mock("../preview", () => ({
    selectPreviewLayerIds: () => [],
}))

vi.mock("@/lib/maplibre", () => ({
    queryFeaturesInPoint: vi.fn().mockReturnValue([]),
}))

vi.mock("../actions", () => {
    const makeAction = (type: string) =>
        Object.assign((payload: unknown) => ({ type, payload }), {
            type,
            match: (action: { type: string }) => action.type === type,
        })
    return {
        actions: {
            selection: {
                sync: makeAction("selection/sync"),
                apply: makeAction("selection/apply"),
            },
        },
    }
})

import { rectSelectDrag, rectSelectCommit } from "../rect-select"
import listener from "./rect-select"

type Action = { type: string; payload?: unknown }

function makeStore(state: Record<string, unknown>) {
    const dispatched: Action[] = []
    const capture = () => (next: (a: unknown) => unknown) => (action: unknown) => {
        dispatched.push(action as Action)
        return next(action)
    }
    const store = configureStore({
        reducer: (s = state) => s,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware()
                .prepend(listener.middleware)
                .concat(capture as unknown as Middleware),
    })
    return { store, dispatched }
}

describe("rect-select listener", () => {
    let testTimeBase = 1000

    beforeEach(() => {
        vi.useFakeTimers()
        // Each test gets a unique time base far from any previous throttle timestamp
        testTimeBase += 10000
        vi.setSystemTime(testTimeBase)
        invokeMock.mockReset()
        invokeMock.mockResolvedValue({ added: [1, 2], removed: [] })
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test("rectSelectDrag issues a single selection_rect IPC call with op=set (no modifier)", async () => {
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "none",
            }),
        )

        await vi.runAllTimersAsync()

        const rectCalls = invokeMock.mock.calls.filter((c: unknown[]) => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({
            sourceId: "src-1",
            mode: "include",
            op: "set",
        })
        expect(invokeMock.mock.calls.some((c: unknown[]) => c[0] === "source_query_rect")).toBe(false)
        expect(invokeMock.mock.calls.some((c: unknown[]) => c[0] === "selection_set")).toBe(false)
    })

    test("rectSelectDrag with shift modifier uses op=preview", async () => {
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "shift",
            }),
        )

        await vi.runAllTimersAsync()

        const rectCalls = invokeMock.mock.calls.filter((c: unknown[]) => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({ op: "preview" })
    })

    test("rectSelectDrag right-to-left produces mode=intersect", async () => {
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 100, y: 10 },
                current: { x: 10, y: 100 },
                modifier: "none",
            }),
        )

        await vi.runAllTimersAsync()

        const rectCalls = invokeMock.mock.calls.filter((c: unknown[]) => c[0] === "selection_rect")
        expect(rectCalls[0][1]).toMatchObject({ mode: "intersect" })
    })

    test("rectSelectDrag is a no-op when no source is selected", async () => {
        const { store } = makeStore({ source: { selectedId: null } })

        store.dispatch(
            rectSelectDrag({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "none",
            }),
        )

        await vi.runAllTimersAsync()

        expect(invokeMock).not.toHaveBeenCalled()
    })

    test("rectSelectCommit uses op=set (no modifier), then apply + count", async () => {
        invokeMock.mockImplementation((cmd: string) => {
            if (cmd === "selection_rect") return Promise.resolve({ added: [1], removed: [] })
            if (cmd === "selection_apply") return Promise.resolve({ added: [], removed: [] })
            if (cmd === "selection_count") return Promise.resolve(1)
            return Promise.resolve()
        })
        const { store, dispatched } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectCommit({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "none",
            }),
        )

        await vi.runAllTimersAsync()

        const rectCalls = invokeMock.mock.calls.filter((c: unknown[]) => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({ op: "set" })
        expect(invokeMock.mock.calls.some((c: unknown[]) => c[0] === "selection_apply")).toBe(true)
        expect(invokeMock.mock.calls.some((c: unknown[]) => c[0] === "selection_count")).toBe(true)
        expect(dispatched.some(a => a.type === "selection/sync")).toBe(true)
        expect(dispatched.some(a => a.type === "selection/apply")).toBe(true)
    })

    test("rectSelectCommit with shift modifier uses op=add", async () => {
        invokeMock.mockImplementation((cmd: string) => {
            if (cmd === "selection_rect") return Promise.resolve({ added: [1], removed: [] })
            if (cmd === "selection_apply") return Promise.resolve({ added: [], removed: [] })
            if (cmd === "selection_count") return Promise.resolve(1)
            return Promise.resolve()
        })
        const { store } = makeStore({ source: { selectedId: "src-1" } })

        store.dispatch(
            rectSelectCommit({
                start: { x: 10, y: 10 },
                current: { x: 100, y: 100 },
                modifier: "shift",
            }),
        )

        await vi.runAllTimersAsync()

        const rectCalls = invokeMock.mock.calls.filter((c: unknown[]) => c[0] === "selection_rect")
        expect(rectCalls).toHaveLength(1)
        expect(rectCalls[0][1]).toMatchObject({ op: "add" })
    })
})

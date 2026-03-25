import { configureStore } from "@reduxjs/toolkit"
import { type MockInstance, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn().mockResolvedValue({ id: "empty-id", name: "empty", location: "memory://empty-id" }),
}))

vi.mock("@/logger", () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("@/lib/nextId", () => ({
    nextId: vi.fn().mockReturnValue("source-0"),
}))

vi.mock(".", () => ({
    actions: {
        addInMemorySource: vi.fn().mockImplementation((payload: unknown) => ({
            type: "source/addInMemorySource",
            payload,
        })),
    },
}))

import { invoke } from "@tauri-apps/api/core"
import { actions } from "."
import empty from "./empty"

const mockInvoke = vi.mocked(invoke)
const mockAddInMemorySource = vi.mocked(actions.addInMemorySource)

const makeStore = () => configureStore({ reducer: (state: Record<string, never> = {}) => state })

describe("empty thunk", () => {
    let store: ReturnType<typeof makeStore>
    let dispatchSpy: MockInstance

    beforeEach(() => {
        vi.clearAllMocks()
        mockInvoke.mockResolvedValue({ id: "empty-id", name: "My Layer", location: "memory://empty-id" })
        store = makeStore()
        dispatchSpy = vi.spyOn(store, "dispatch")
    })

    test("calls invoke with source_add_data and an empty FeatureCollection", async () => {
        await empty()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_add_data", expect.objectContaining({ name: "New source-0" }))
        const [, args] = mockInvoke.mock.calls[0] as [string, { name: string; data: string }]
        const parsed = JSON.parse(args.data)
        expect(parsed.type).toBe("FeatureCollection")
        expect(parsed.features).toHaveLength(0)
    })

    test("dispatches addInMemorySource with all-zero meta and IPC result", async () => {
        await empty()(store.dispatch, store.getState, undefined)

        expect(mockAddInMemorySource).toHaveBeenCalledOnce()
        const call = mockAddInMemorySource.mock.calls[0][0]
        expect(call.id).toBe("empty-id")
        expect(call.name).toBe("My Layer")
        expect(call.location).toBe("memory://empty-id")
        expect(call.meta.pointsCount).toBe(0)
        expect(call.meta.linesCount).toBe(0)
        expect(call.meta.polygonsCount).toBe(0)
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "source/addInMemorySource" }))
    })

    test("does not dispatch addInMemorySource when invoke rejects", async () => {
        mockInvoke.mockRejectedValue(new Error("IPC error"))

        await empty()(store.dispatch, store.getState, undefined)

        expect(mockAddInMemorySource).not.toHaveBeenCalled()
    })
})

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

type Listener<T> = (event: { payload: T }) => void

const listeners = new Map<string, Set<Listener<unknown>>>()

vi.mock("@tauri-apps/api/event", () => ({
    listen: vi.fn(<T>(event: string, handler: Listener<T>) => {
        const set = listeners.get(event) ?? new Set()
        set.add(handler as Listener<unknown>)
        listeners.set(event, set)
        return Promise.resolve(() => {
            set.delete(handler as Listener<unknown>)
        })
    }),
}))

function emit<T>(event: string, payload: T) {
    const set = listeners.get(event)
    if (!set) {
        return
    }
    for (const handler of set) {
        handler({ payload })
    }
}

function listenerCount(event: string): number {
    return listeners.get(event)?.size ?? 0
}

// Import after mock is set up
const { waitEvent } = await import("./tauri")

describe("lib/tauri/waitEvent", () => {
    beforeEach(() => {
        listeners.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test("resolves with event payload when event fires", async () => {
        const promise = waitEvent<{ status: string }>("test-event")
        emit("test-event", { status: "ok" })
        const result = await promise
        expect(result).toEqual({ status: "ok" })
    })

    test("unregisters listener after resolving", async () => {
        const promise = waitEvent<number>("once")
        // Give listen() a microtask to resolve
        await Promise.resolve()
        expect(listenerCount("once")).toBe(1)
        emit("once", 42)
        await promise
        expect(listenerCount("once")).toBe(0)
    })

    test("rejects with timeout error when event does not fire in time", async () => {
        vi.useFakeTimers()
        const promise = waitEvent("slow", 1000)
        // Allow listen() promise to resolve
        await vi.advanceTimersByTimeAsync(0)
        vi.advanceTimersByTime(1000)
        await expect(promise).rejects.toThrow(/Timeout waiting for event: slow/)
    })

    test("unregisters listener after timeout", async () => {
        vi.useFakeTimers()
        const promise = waitEvent("slow", 500)
        await vi.advanceTimersByTimeAsync(0)
        expect(listenerCount("slow")).toBe(1)
        vi.advanceTimersByTime(500)
        await expect(promise).rejects.toThrow()
        expect(listenerCount("slow")).toBe(0)
    })

    test("does not reject when event fires before timeout", async () => {
        vi.useFakeTimers()
        const promise = waitEvent<string>("fast", 1000)
        await vi.advanceTimersByTimeAsync(0)
        emit("fast", "done")
        await expect(promise).resolves.toBe("done")
        // Advancing past timeout should not cause unhandled rejection
        vi.advanceTimersByTime(2000)
    })

    test("no timeout set: waits indefinitely until event", async () => {
        const promise = waitEvent<number>("no-timeout")
        await Promise.resolve()
        emit("no-timeout", 7)
        await expect(promise).resolves.toBe(7)
    })
})

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

// Import after mock is set up
const { waitEvent } = await import("./tauri")

describe("lib/tauri/waitEvent", () => {
    beforeEach(() => {
        listeners.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test("resolves with the Tauri event payload", async () => {
        const promise = waitEvent<{ status: string }>("test-event")
        emit("test-event", { status: "ok" })
        await expect(promise).resolves.toEqual({ status: "ok" })
    })

    test("timeout error message includes the event name", async () => {
        vi.useFakeTimers()
        const promise = waitEvent("slow", 1000)
        await vi.advanceTimersByTimeAsync(0)
        vi.advanceTimersByTime(1000)
        await expect(promise).rejects.toThrow("Timeout waiting for event: slow")
    })
})

import { afterEach, describe, expect, test, vi } from "vitest"
import { once } from "./once"

type Handler<T> = (value: T) => void

function makeSource<T>() {
    const handlers = new Set<Handler<T>>()
    const subscribe = (handler: Handler<T>) => {
        handlers.add(handler)
        return () => {
            handlers.delete(handler)
        }
    }
    const emit = (value: T) => {
        for (const handler of handlers) {
            handler(value)
        }
    }
    const size = () => handlers.size
    return { subscribe, emit, size }
}

function makeAsyncSource<T>() {
    const handlers = new Set<Handler<T>>()
    const subscribe = async (handler: Handler<T>) => {
        handlers.add(handler)
        return () => {
            handlers.delete(handler)
        }
    }
    const emit = (value: T) => {
        for (const handler of handlers) {
            handler(value)
        }
    }
    const size = () => handlers.size
    return { subscribe, emit, size }
}

describe("lib/once", () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    test("resolves with value when handler is invoked", async () => {
        const src = makeSource<{ status: string }>()
        const promise = once(src.subscribe)
        src.emit({ status: "ok" })
        await expect(promise).resolves.toEqual({ status: "ok" })
    })

    test("unsubscribes after resolving (sync unsubscribe)", async () => {
        const src = makeSource<number>()
        const promise = once(src.subscribe)
        expect(src.size()).toBe(1)
        src.emit(42)
        await promise
        expect(src.size()).toBe(0)
    })

    test("unsubscribes after resolving (async unsubscribe)", async () => {
        const src = makeAsyncSource<number>()
        const promise = once(src.subscribe)
        // wait for subscribe promise to resolve
        await Promise.resolve()
        expect(src.size()).toBe(1)
        src.emit(7)
        await promise
        expect(src.size()).toBe(0)
    })

    test("rejects with timeout error using default label", async () => {
        vi.useFakeTimers()
        const src = makeSource<number>()
        const promise = once(src.subscribe, { timeout: 1000 })
        await vi.advanceTimersByTimeAsync(0)
        vi.advanceTimersByTime(1000)
        await expect(promise).rejects.toThrow(/Timeout waiting for event/)
    })

    test("rejects with timeout error including custom label", async () => {
        vi.useFakeTimers()
        const src = makeSource<number>()
        const promise = once(src.subscribe, { timeout: 500, label: "init signal" })
        await vi.advanceTimersByTimeAsync(0)
        vi.advanceTimersByTime(500)
        await expect(promise).rejects.toThrow("Timeout waiting for init signal")
    })

    test("unsubscribes after timeout", async () => {
        vi.useFakeTimers()
        const src = makeAsyncSource<number>()
        const promise = once(src.subscribe, { timeout: 500 })
        await vi.advanceTimersByTimeAsync(0)
        expect(src.size()).toBe(1)
        vi.advanceTimersByTime(500)
        await expect(promise).rejects.toThrow()
        // allow unsubscribe promise to resolve
        await Promise.resolve()
        expect(src.size()).toBe(0)
    })

    test("does not reject when value arrives before timeout", async () => {
        vi.useFakeTimers()
        const src = makeSource<string>()
        const promise = once(src.subscribe, { timeout: 1000 })
        await vi.advanceTimersByTimeAsync(0)
        src.emit("done")
        await expect(promise).resolves.toBe("done")
        // advancing past timeout should not cause unhandled rejection
        vi.advanceTimersByTime(2000)
    })

    test("no timeout: waits indefinitely until value arrives", async () => {
        const src = makeSource<number>()
        const promise = once(src.subscribe)
        src.emit(7)
        await expect(promise).resolves.toBe(7)
    })
})

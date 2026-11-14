import { describe, expect, test, vi } from "vitest"
import { emitSelectionDelta, emitSelectionReconcile, onSelectionDelta, onSelectionReconcile } from "./selection-bus"

describe("selection bus", () => {
    test("every delta listener gets every emit", () => {
        const a = vi.fn()
        const b = vi.fn()
        const offA = onSelectionDelta(a)
        const offB = onSelectionDelta(b)
        emitSelectionDelta({ added: [1], removed: [] })
        expect(a).toHaveBeenCalledWith({ added: [1], removed: [] })
        expect(b).toHaveBeenCalledWith({ added: [1], removed: [] })
        offA()
        offB()
    })

    test("unsubscribing one delta listener leaves the other", () => {
        const a = vi.fn()
        const b = vi.fn()
        const offA = onSelectionDelta(a)
        const offB = onSelectionDelta(b)
        offA()
        emitSelectionDelta({ added: [2], removed: [] })
        expect(a).not.toHaveBeenCalled()
        expect(b).toHaveBeenCalledTimes(1)
        offB()
    })

    test("every reconcile listener gets every emit", () => {
        const a = vi.fn()
        const b = vi.fn()
        const offA = onSelectionReconcile(a)
        const offB = onSelectionReconcile(b)
        emitSelectionReconcile([1, 2], "s1")
        expect(a).toHaveBeenCalledWith({ ids: [1, 2], sourceId: "s1" })
        expect(b).toHaveBeenCalledWith({ ids: [1, 2], sourceId: "s1" })
        offA()
        offB()
    })

    test("unsubscribing one reconcile listener leaves the other", () => {
        const a = vi.fn()
        const b = vi.fn()
        const offA = onSelectionReconcile(a)
        const offB = onSelectionReconcile(b)
        offA()
        emitSelectionReconcile([3], "s1")
        expect(a).not.toHaveBeenCalled()
        expect(b).toHaveBeenCalledTimes(1)
        offB()
    })
})

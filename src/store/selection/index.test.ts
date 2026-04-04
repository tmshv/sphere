import { describe, expect, test } from "vitest"
import reducer, { selectionSlice } from "./index"

const { sync, reset, apply } = selectionSlice.actions

describe("selectionSlice reducer", () => {
    test("initial state", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.count).toBe(0)
        expect(state.version).toBe(0)
    })

    test("sync updates count and bumps version", () => {
        const state = reducer(undefined, sync({ count: 42 }))
        expect(state.count).toBe(42)
        expect(state.version).toBe(1)
    })

    test("sync bumps version each time", () => {
        let state = reducer(undefined, sync({ count: 10 }))
        state = reducer(state, sync({ count: 20 }))
        expect(state.count).toBe(20)
        expect(state.version).toBe(2)
    })

    test("reset clears count and bumps version", () => {
        let state = reducer(undefined, sync({ count: 10 }))
        state = reducer(state, reset())
        expect(state.count).toBe(0)
        expect(state.version).toBe(2)
    })

    test("apply is a no-op on state", () => {
        const prev = { count: 5, version: 3 }
        const state = reducer(prev, apply())
        expect(state.count).toBe(5)
        expect(state.version).toBe(3)
    })
})

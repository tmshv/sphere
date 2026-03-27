import { describe, expect, test } from "vitest"
import reducer, { selectionSlice } from "./index"

const { reset, selectOne, selectMany } = selectionSlice.actions

describe("selectionSlice reducer", () => {
    test("initial state", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.selectedIds).toEqual([])
    })

    test("reset clears selectedIds", () => {
        const prev = { selectedIds: [1, 2] }
        const state = reducer(prev, reset())
        expect(state.selectedIds).toEqual([])
    })

    test("selectOne sets selectedIds from featureId", () => {
        const state = reducer(undefined, selectOne({ featureId: 42 }))
        expect(state.selectedIds).toEqual([42])
    })

    test("selectMany sets selectedIds", () => {
        const prev = { selectedIds: [1] }
        const state = reducer(prev, selectMany({ featureIds: [10, 20] }))
        expect(state.selectedIds).toEqual([10, 20])
    })

    test("selectMany then selectOne replaces selectedIds", () => {
        let state = reducer(undefined, selectMany({ featureIds: [1, 2] }))
        state = reducer(state, selectOne({ featureId: 5 }))
        expect(state.selectedIds).toEqual([5])
    })

    test("reset clears selectedIds after selectMany", () => {
        const prev = { selectedIds: [1, 2] }
        const state = reducer(prev, reset())
        expect(state.selectedIds).toEqual([])
    })

    test("selectOne replaces previous selectedIds", () => {
        const prev = { selectedIds: [1, 2] }
        const state = reducer(prev, selectOne({ featureId: 99 }))
        expect(state.selectedIds).toEqual([99])
    })
})

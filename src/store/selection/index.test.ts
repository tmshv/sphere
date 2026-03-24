import { describe, expect, test } from "vitest"
import reducer, { selectionSlice } from "./index"

const { reset, selectOne } = selectionSlice.actions

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
        const state = reducer(undefined, selectOne({ layerId: "l1", featureId: 42 }))
        expect(state.selectedIds).toEqual([42])
    })

    test("selectOne replaces previous selectedIds", () => {
        const prev = { selectedIds: [1, 2] }
        const state = reducer(prev, selectOne({ layerId: "l1", featureId: 99 }))
        expect(state.selectedIds).toEqual([99])
    })
})

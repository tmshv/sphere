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
        const state = reducer(undefined, selectOne({ layerId: "l1", featureId: 42 }))
        expect(state.selectedIds).toEqual([42])
    })

    test("selectOne clears sourceId", () => {
        const prev = { sourceId: "s1", layerId: undefined, selectedIds: [] }
        const state = reducer(prev, selectOne({ layerId: "l1", featureId: 42 }))
        expect(state.sourceId).toBeUndefined()
        expect(state.layerId).toBe("l1")
        expect(state.selectedIds).toEqual([42])
    })

    test("selectMany sets sourceId, clears layerId, sets selectedIds", () => {
        const prev = { sourceId: undefined, layerId: "l1", selectedIds: [1] }
        const state = reducer(prev, selectMany({ sourceId: "s2", featureIds: [10, 20] }))
        expect(state.sourceId).toBe("s2")
        expect(state.layerId).toBeUndefined()
        expect(state.selectedIds).toEqual([10, 20])
    })

    test("selectMany and selectOne are mutually exclusive", () => {
        let state = reducer(undefined, selectMany({ sourceId: "s1", featureIds: [1, 2] }))
        state = reducer(state, selectOne({ layerId: "l1", featureId: 5 }))
        expect(state.sourceId).toBeUndefined()
        expect(state.layerId).toBe("l1")
    })

    test("reset clears layerId, sourceId, and selectedIds", () => {
        const prev = { sourceId: "s1", layerId: "l1", selectedIds: [1, 2] }
        const state = reducer(prev, reset())
        expect(state.sourceId).toBeUndefined()
        expect(state.layerId).toBeUndefined()
        expect(state.selectedIds).toEqual([])
    })

    test("selectOne replaces previous selectedIds", () => {
        const prev = { selectedIds: [1, 2] }
        const state = reducer(prev, selectOne({ layerId: "l1", featureId: 99 }))
        expect(state.selectedIds).toEqual([99])
    })
})

import { describe, expect, test } from "vitest"
import reducer, { selectionSlice } from "./index"

const { reset, selectSource, selectLayer, selectOne, selectMany } = selectionSlice.actions
const { currentSourceId, currentLayerId } = selectionSlice.selectors

const makeRootState = (selection: object) => ({ selection }) as any

describe("selectionSlice reducer", () => {
    test("initial state", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.sourceId).toBeUndefined()
        expect(state.layerId).toBeUndefined()
        expect(state.selectedIds).toEqual([])
    })

    test("reset clears sourceId and selectedIds", () => {
        const prev = { sourceId: "s1", layerId: "l1", selectedIds: [1, 2] }
        const state = reducer(prev, reset())
        expect(state.sourceId).toBeUndefined()
        expect(state.selectedIds).toEqual([])
    })

    test("selectSource sets sourceId", () => {
        const state = reducer(undefined, selectSource({ sourceId: "s1" }))
        expect(state.sourceId).toBe("s1")
    })

    test("selectSource with undefined clears sourceId", () => {
        const prev = { sourceId: "s1", layerId: undefined, selectedIds: [] }
        const state = reducer(prev, selectSource({ sourceId: undefined }))
        expect(state.sourceId).toBeUndefined()
    })

    test("selectLayer sets layerId", () => {
        const state = reducer(undefined, selectLayer({ layerId: "l1" }))
        expect(state.layerId).toBe("l1")
    })

    test("selectLayer with undefined clears layerId", () => {
        const prev = { sourceId: undefined, layerId: "l1", selectedIds: [] }
        const state = reducer(prev, selectLayer({ layerId: undefined }))
        expect(state.layerId).toBeUndefined()
    })

    test("selectOne sets layerId and selectedIds", () => {
        const state = reducer(undefined, selectOne({ layerId: "l1", featureId: 42 }))
        expect(state.layerId).toBe("l1")
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
        // After selectMany, selectOne clears sourceId
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
})

describe("selectionSlice selectors", () => {
    test("currentSourceId returns sourceId", () => {
        expect(currentSourceId(makeRootState({ sourceId: "s1" }))).toBe("s1")
    })

    test("currentSourceId returns undefined when not set", () => {
        expect(currentSourceId(makeRootState({}))).toBeUndefined()
    })

    test("currentLayerId returns layerId", () => {
        expect(currentLayerId(makeRootState({ layerId: "l1" }))).toBe("l1")
    })

    test("currentLayerId returns undefined when not set", () => {
        expect(currentLayerId(makeRootState({}))).toBeUndefined()
    })
})

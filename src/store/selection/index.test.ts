import { describe, expect, test } from "vitest"
import { layerSlice } from "../layer"
import { sourceSlice } from "../source"
import reducer, { selectionSlice } from "./index"

const { reset, selectSource, selectLayer, selectOne } = selectionSlice.actions
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

    test("removeLayer extra reducer clears layerId when deleted layer is selected", () => {
        const prev = { sourceId: undefined, layerId: "l1", selectedIds: [] }
        const state = reducer(prev, layerSlice.actions.removeLayer("l1"))
        expect(state.layerId).toBeUndefined()
    })

    test("removeLayer extra reducer preserves layerId when a different layer is deleted", () => {
        const prev = { sourceId: undefined, layerId: "l2", selectedIds: [] }
        const state = reducer(prev, layerSlice.actions.removeLayer("l1"))
        expect(state.layerId).toBe("l2")
    })

    test("removeLayer does not affect sourceId", () => {
        const prev = { sourceId: "s1", layerId: "l1", selectedIds: [] }
        const state = reducer(prev, layerSlice.actions.removeLayer("l1"))
        expect(state.sourceId).toBe("s1")
    })

    test("removeSource extra reducer clears sourceId when deleted source is selected", () => {
        const prev = { sourceId: "s1", layerId: undefined, selectedIds: [] }
        const state = reducer(prev, sourceSlice.actions.removeSource("s1"))
        expect(state.sourceId).toBeUndefined()
    })

    test("removeSource extra reducer preserves sourceId when a different source is deleted", () => {
        const prev = { sourceId: "s2", layerId: undefined, selectedIds: [] }
        const state = reducer(prev, sourceSlice.actions.removeSource("s1"))
        expect(state.sourceId).toBe("s2")
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

import { describe, expect, test } from "vitest"
import reducer, { drawSlice } from "./draw"

const { start, setSelectedIds, done, reset } = drawSlice.actions
const { isDrawing } = drawSlice.selectors

const makeRootState = (draw: object) => ({ draw }) as any

describe("drawSlice reducer", () => {
    test("initial state has no sourceId", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.sourceId).toBeUndefined()
    })

    test("start sets sourceId", () => {
        const state = reducer(undefined, start({ sourceId: "my-source" }))
        expect(state.sourceId).toBe("my-source")
    })

    test("start with another id sets sourceId", () => {
        const state = reducer(undefined, start({ sourceId: "source-42" }))
        expect(state.sourceId).toBe("source-42")
    })

    test("start initializes selectedIds to empty", () => {
        const state = reducer(undefined, start({ sourceId: "s1" }))
        expect(state.selectedIds).toEqual([])
    })

    test("setSelectedIds sets selectedIds", () => {
        const prev = reducer(undefined, start({ sourceId: "s1" }))
        const state = reducer(prev, setSelectedIds([1, 2, 3]))
        expect(state.selectedIds).toEqual([1, 2, 3])
    })

    test("setSelectedIds with empty array", () => {
        const prev = { sourceId: "s1", selectedIds: [1, 2] }
        const state = reducer(prev, setSelectedIds([]))
        expect(state.selectedIds).toEqual([])
    })

    test("done clears sourceId", () => {
        const prev = { sourceId: "my-source", selectedIds: [1, 2] }
        const state = reducer(prev, done({ sourceId: "my-source" }))
        expect(state.sourceId).toBeUndefined()
    })

    test("done clears selectedIds", () => {
        const prev = { sourceId: "s1", selectedIds: [1, 2] }
        const state = reducer(prev, done({ sourceId: "s1" }))
        expect(state.selectedIds).toEqual([])
    })

    test("reset clears sourceId", () => {
        const prev = { sourceId: "my-source", selectedIds: [] }
        const state = reducer(prev, reset())
        expect(state.sourceId).toBeUndefined()
    })

    test("reset clears selectedIds", () => {
        const prev = { sourceId: "s1", selectedIds: [1, 2] }
        const state = reducer(prev, reset())
        expect(state.selectedIds).toEqual([])
    })
})

describe("drawSlice selectors", () => {
    test("isDrawing returns false when sourceId is undefined", () => {
        expect(isDrawing(makeRootState({ sourceId: undefined }))).toBe(false)
    })

    test("isDrawing returns true when sourceId is set", () => {
        expect(isDrawing(makeRootState({ sourceId: "my-source" }))).toBe(true)
    })

    test("isDrawing returns true when sourceId is a non-empty string", () => {
        expect(isDrawing(makeRootState({ sourceId: "src-1" }))).toBe(true)
    })
})

import { describe, expect, test } from "vitest"
import reducer, { drawSlice } from "./draw"

const { start, done, reset } = drawSlice.actions
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

    test("done clears sourceId", () => {
        const prev = { sourceId: "my-source" }
        const state = reducer(prev, done({ sourceId: "my-source" }))
        expect(state.sourceId).toBeUndefined()
    })

    test("reset clears sourceId", () => {
        const prev = { sourceId: "my-source" }
        const state = reducer(prev, reset())
        expect(state.sourceId).toBeUndefined()
    })

    test("start with another id sets sourceId", () => {
        const state = reducer(undefined, start({ sourceId: "source-42" }))
        expect(state.sourceId).toBe("source-42")
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

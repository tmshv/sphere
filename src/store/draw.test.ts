import { describe, test, expect } from "vitest"
import reducer, { drawSlice } from "./draw"

const { start, done, reset } = drawSlice.actions
const { isDrawing } = drawSlice.selectors

const makeRootState = (draw: object) => ({ draw } as any)

const emptyFeatureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [],
}

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
        const state = reducer(prev, done({ sourceId: "my-source", featureCollection: emptyFeatureCollection }))
        expect(state.sourceId).toBeUndefined()
    })

    test("reset clears sourceId", () => {
        const prev = { sourceId: "my-source" }
        const state = reducer(prev, reset())
        expect(state.sourceId).toBeUndefined()
    })

    test("start with numeric id sets sourceId", () => {
        const state = reducer(undefined, start({ sourceId: 42 }))
        expect(state.sourceId).toBe(42)
    })
})

describe("drawSlice selectors", () => {
    test("isDrawing returns false when sourceId is undefined", () => {
        expect(isDrawing(makeRootState({ sourceId: undefined }))).toBe(false)
    })

    test("isDrawing returns true when sourceId is set", () => {
        expect(isDrawing(makeRootState({ sourceId: "my-source" }))).toBe(true)
    })

    test("isDrawing returns true when sourceId is a number", () => {
        expect(isDrawing(makeRootState({ sourceId: 1 }))).toBe(true)
    })
})

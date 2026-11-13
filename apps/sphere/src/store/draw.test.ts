import { describe, expect, test } from "vitest"
import reducer, { drawSlice } from "./draw"

const { start, started, commit, cancel, settle, done, reset } = drawSlice.actions
const { isDrawing, isPending, sourceId } = drawSlice.selectors

import type { RootState } from "./index"

const makeRootState = (draw: object) => ({ draw }) as unknown as RootState

const drawing = { sourceId: "my-source", pending: false }

describe("drawSlice reducer", () => {
    test("initial state has no sourceId and nothing pending", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(false)
    })

    test("start does not enter draw mode, it only marks the begin as pending", () => {
        const state = reducer(undefined, start({ sourceId: "my-source" }))
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(true)
    })

    test("start while drawing changes nothing", () => {
        const state = reducer(drawing, start({ sourceId: "other" }))
        expect(state).toEqual(drawing)
    })

    test("started enters draw mode", () => {
        const state = reducer({ pending: true }, started({ sourceId: "source-42" }))
        expect(state.sourceId).toBe("source-42")
        expect(state.pending).toBe(false)
    })

    test("commit and cancel mark the session end as pending", () => {
        expect(reducer(drawing, commit({ sourceId: "my-source" })).pending).toBe(true)
        expect(reducer(drawing, cancel({ sourceId: "my-source" })).pending).toBe(true)
    })

    test("commit and cancel for another source change nothing", () => {
        expect(reducer(drawing, commit({ sourceId: "other" }))).toEqual(drawing)
        expect(reducer(drawing, cancel({ sourceId: "other" }))).toEqual(drawing)
    })

    test("settle clears pending and keeps draw mode", () => {
        const state = reducer({ sourceId: "my-source", pending: true }, settle())
        expect(state).toEqual(drawing)
    })

    test("done clears sourceId", () => {
        const state = reducer({ sourceId: "my-source", pending: true }, done({ sourceId: "my-source" }))
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(false)
    })

    test("reset clears sourceId", () => {
        const state = reducer({ sourceId: "my-source", pending: true }, reset())
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(false)
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

    test("sourceId and isPending read the state", () => {
        const state = makeRootState({ sourceId: "src-1", pending: true })
        expect(sourceId(state)).toBe("src-1")
        expect(isPending(state)).toBe(true)
    })
})

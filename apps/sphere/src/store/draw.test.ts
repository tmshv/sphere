import { describe, expect, test } from "vitest"
import reducer, { drawSlice } from "./draw"

const { start, started, commit, cancel, settle, done, reset, setHiddenIds, selectionChanged } = drawSlice.actions
const { isDrawing, isPending, sourceId, hiddenIds } = drawSlice.selectors

import type { RootState } from "./index"

const makeRootState = (draw: object) => ({ draw }) as unknown as RootState

const drawing = { sourceId: "my-source", pending: false, hiddenIds: [] }

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
        const state = reducer({ pending: true, hiddenIds: [] }, started({ sourceId: "source-42" }))
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
        const state = reducer({ sourceId: "my-source", pending: true, hiddenIds: [] }, settle())
        expect(state).toEqual(drawing)
    })

    test("done clears sourceId", () => {
        const state = reducer({ sourceId: "my-source", pending: true, hiddenIds: [] }, done({ sourceId: "my-source" }))
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(false)
    })

    test("selectionChanged is a signal: it changes no state", () => {
        const withHidden = { ...drawing, hiddenIds: [1] }
        const action = selectionChanged({ sourceId: "my-source", ids: [1, "draw-a"] })
        expect(reducer(withHidden, action)).toBe(withHidden)
        expect(action.payload).toEqual({ sourceId: "my-source", ids: [1, "draw-a"] })
    })

    test("reset clears sourceId", () => {
        const state = reducer({ sourceId: "my-source", pending: true, hiddenIds: [] }, reset())
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(false)
    })
})

describe("drawSlice hiddenIds", () => {
    const withHidden = { sourceId: "my-source", pending: false, hiddenIds: [1, 2] }

    test("start with nothing hidden", () => {
        expect(reducer(undefined, { type: "@@INIT" }).hiddenIds).toEqual([])
    })

    test("setHiddenIds replaces the ids loaded into draw for the drawn source", () => {
        const state = reducer(withHidden, setHiddenIds({ sourceId: "my-source", ids: [3, 4, 5] }))
        expect(state.hiddenIds).toEqual([3, 4, 5])
    })

    test("setHiddenIds for another source changes nothing", () => {
        expect(reducer(withHidden, setHiddenIds({ sourceId: "other", ids: [3] }))).toEqual(withHidden)
    })

    test("setHiddenIds while not drawing changes nothing", () => {
        const idle = { pending: false, hiddenIds: [] }
        expect(reducer(idle, setHiddenIds({ sourceId: "my-source", ids: [3] }))).toEqual(idle)
    })

    test("started begins with nothing hidden", () => {
        const state = reducer({ pending: true, hiddenIds: [7] }, started({ sourceId: "my-source" }))
        expect(state.hiddenIds).toEqual([])
    })

    test("pending commit or cancel keeps the hidden ids: the base source has not re-fetched yet", () => {
        expect(reducer(withHidden, commit({ sourceId: "my-source" })).hiddenIds).toEqual([1, 2])
        expect(reducer(withHidden, cancel({ sourceId: "my-source" })).hiddenIds).toEqual([1, 2])
    })

    test("settle with the session still open keeps the hidden ids", () => {
        const state = reducer({ ...withHidden, pending: true }, settle())
        expect(state.hiddenIds).toEqual([1, 2])
    })

    test("settle without a session clears the hidden ids", () => {
        const state = reducer({ pending: true, hiddenIds: [1] }, settle())
        expect(state.hiddenIds).toEqual([])
    })

    test("done and reset clear the hidden ids", () => {
        expect(reducer(withHidden, done({ sourceId: "my-source" })).hiddenIds).toEqual([])
        expect(reducer(withHidden, reset()).hiddenIds).toEqual([])
    })

    test("hiddenIds selector reads the state", () => {
        expect(hiddenIds(makeRootState(withHidden))).toEqual([1, 2])
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

import { describe, expect, test } from "vitest"
import reducer, { actions, drawSlice } from "./draw"

const { start, started, commit, cancel, settle, done, reset, setHiddenIds, modeChanged } = drawSlice.actions
const { isDrawing, isPending, sourceId, hiddenIds, isCreating } = drawSlice.selectors

import type { RootState } from "./index"

const makeRootState = (draw: object) => ({ draw }) as unknown as RootState

const NOTHING = { trash: false, combineFeatures: false, uncombineFeatures: false }

const drawing = { sourceId: "my-source", pending: false, hiddenIds: [], actionable: NOTHING }

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
        const state = reducer({ pending: true, hiddenIds: [], actionable: NOTHING }, started({ sourceId: "source-42" }))
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
        const state = reducer({ sourceId: "my-source", pending: true, hiddenIds: [], actionable: NOTHING }, settle())
        expect(state).toEqual(drawing)
    })

    test("done clears sourceId", () => {
        const state = reducer(
            { sourceId: "my-source", pending: true, hiddenIds: [], actionable: NOTHING },
            done({ sourceId: "my-source" }),
        )
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(false)
    })

    test("selectionChanged is a signal: it changes no state", () => {
        const withHidden = { ...drawing, hiddenIds: [1] }
        const action = actions.selectionChanged({ sourceId: "my-source", ids: [1, "draw-a"] })
        expect(action.type).toBe("draw/selectionChanged")
        expect("selectionChanged" in drawSlice.actions).toBe(false)
        expect(reducer(withHidden, action)).toBe(withHidden)
        expect(action.payload).toEqual({ sourceId: "my-source", ids: [1, "draw-a"] })
    })

    test("reset clears sourceId", () => {
        const state = reducer({ sourceId: "my-source", pending: true, hiddenIds: [], actionable: NOTHING }, reset())
        expect(state.sourceId).toBeUndefined()
        expect(state.pending).toBe(false)
    })
})

describe("drawSlice hiddenIds", () => {
    const withHidden = { sourceId: "my-source", pending: false, hiddenIds: [1, 2], actionable: NOTHING }

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
        const idle = { pending: false, hiddenIds: [], actionable: NOTHING }
        expect(reducer(idle, setHiddenIds({ sourceId: "my-source", ids: [3] }))).toEqual(idle)
    })

    test("started begins with nothing hidden", () => {
        const state = reducer(
            { pending: true, hiddenIds: [7], actionable: NOTHING },
            started({ sourceId: "my-source" }),
        )
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
        const state = reducer({ pending: true, hiddenIds: [1], actionable: NOTHING }, settle())
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

describe("draw mode of the control", () => {
    test("modeChanged records the mode of the drawn source's control", () => {
        expect(reducer(drawing, modeChanged({ sourceId: "my-source", mode: "draw_polygon" })).mode).toBe("draw_polygon")
    })

    test("modeChanged for another source changes nothing", () => {
        expect(reducer(drawing, modeChanged({ sourceId: "other", mode: "draw_polygon" }))).toEqual(drawing)
    })

    test("a new session, done and reset forget the mode", () => {
        const creating = { ...drawing, mode: "draw_point" }
        expect(reducer(creating, started({ sourceId: "my-source" })).mode).toBeUndefined()
        expect(reducer(creating, done({ sourceId: "my-source" })).mode).toBeUndefined()
        expect(reducer(creating, reset()).mode).toBeUndefined()
    })

    test.each([
        ["draw_point", true],
        ["draw_line_string", true],
        ["draw_polygon", true],
        ["simple_select", false],
        ["direct_select", false],
        [undefined, false],
    ])("isCreating with mode %s is %s", (mode, expected) => {
        expect(isCreating(makeRootState({ ...drawing, mode }))).toBe(expected)
    })

    test.each([
        ["draw_point", "point"],
        ["draw_line_string", "line"],
        ["draw_polygon", "polygon"],
        ["simple_select", undefined],
        [undefined, undefined],
    ])("activeTool with mode %s is %s", (mode, expected) => {
        expect(drawSlice.selectors.activeTool(makeRootState({ ...drawing, mode }))).toBe(expected)
    })
})

describe("draw actionable state", () => {
    const some = { trash: true, combineFeatures: true, uncombineFeatures: false }

    test("nothing is actionable initially", () => {
        expect(reducer(undefined, { type: "@@INIT" }).actionable).toEqual(NOTHING)
    })

    test("actionableChanged stores the state of the drawn source's control", () => {
        const state = reducer(drawing, actions.actionableChanged({ sourceId: "my-source", actionable: some }))
        expect(state.actionable).toEqual(some)
    })

    test("actionableChanged for another source changes nothing", () => {
        expect(reducer(drawing, actions.actionableChanged({ sourceId: "other", actionable: some }))).toEqual(drawing)
    })

    test("a new session, done and reset clear it", () => {
        const actionable = { ...drawing, actionable: some }
        expect(reducer(actionable, started({ sourceId: "my-source" })).actionable).toEqual(NOTHING)
        expect(reducer(actionable, done({ sourceId: "my-source" })).actionable).toEqual(NOTHING)
        expect(reducer(actionable, reset()).actionable).toEqual(NOTHING)
    })

    test("the actionable and mode selectors read the state", () => {
        const state = makeRootState({ ...drawing, actionable: some, mode: "draw_point" })
        expect(drawSlice.selectors.actionable(state)).toEqual(some)
        expect(drawSlice.selectors.mode(state)).toBe("draw_point")
    })

    test("toolbar is a request handled by a listener: it changes no state", () => {
        const action = actions.toolbar({ sourceId: "my-source", action: "polygon" })
        expect(action.type).toBe("draw/toolbar")
        expect("toolbar" in drawSlice.actions).toBe(false)
        expect(reducer(drawing, action)).toBe(drawing)
    })
})

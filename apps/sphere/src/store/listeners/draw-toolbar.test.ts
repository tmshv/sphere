import { afterEach, describe, expect, test, vi } from "vitest"
import { type DrawControlApi, registerDrawControl } from "@/lib/draw-control"
import { makeCaptureStore } from "@/testutils"
import type { DrawToolbarAction } from "@/types"
import { actions } from "../actions"
import listener from "./draw-toolbar"

const SOURCE_ID = "s1"

/** A control whose mode is `mode`, moved by `changeMode` and, while creating, back to `simple_select` by `trash`. */
function makeControl(initialMode: string, modeAfterTrash = "simple_select") {
    let mode = initialMode
    const calls: string[] = []
    const control: DrawControlApi = {
        changeMode: vi.fn((next: string) => {
            calls.push(`changeMode:${next}`)
            mode = next
            return control
        }),
        getMode: vi.fn(() => mode),
        trash: vi.fn(() => {
            calls.push("trash")
            mode = modeAfterTrash
            return control
        }),
        combineFeatures: vi.fn(() => {
            calls.push("combineFeatures")
            return control
        }),
        uncombineFeatures: vi.fn(() => {
            calls.push("uncombineFeatures")
            return control
        }),
    }
    return { control, calls }
}

const cleanups: (() => void)[] = []

function setup(mode: string, modeAfterTrash?: string) {
    const { control, calls } = makeControl(mode, modeAfterTrash)
    cleanups.push(registerDrawControl(SOURCE_ID, control))
    const { store, dispatched } = makeCaptureStore({
        preloadedState: { draw: { sourceId: SOURCE_ID, pending: false, hiddenIds: [] } },
        middleware: listener.middleware,
    })
    return { store, dispatched, control, calls }
}

function toolbar(action: DrawToolbarAction, sourceId = SOURCE_ID) {
    return actions.draw.toolbar({ sourceId, action })
}

/** What the listener dispatched in reply to the toolbar action. */
function replies(dispatched: { type: string }[]) {
    return dispatched.filter(action => action.type !== actions.draw.toolbar.type)
}

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
})

describe("draw-toolbar listener", () => {
    test.each([
        ["point", "draw_point"],
        ["line", "draw_line_string"],
        ["polygon", "draw_polygon"],
    ] as const)("%s in simple_select starts %s and reports the mode it reads back", (action, mode) => {
        const { store, dispatched, calls } = setup("simple_select")

        store.dispatch(toolbar(action))

        expect(calls).toEqual([`changeMode:${mode}`])
        expect(replies(dispatched)).toEqual([actions.draw.modeChanged({ sourceId: SOURCE_ID, mode })])
    })

    test("the pressed tool cancels the feature being drawn instead of starting the tool again", () => {
        const { store, dispatched, control, calls } = setup("draw_polygon")

        store.dispatch(toolbar("polygon"))

        expect(calls).toEqual(["trash"])
        expect(control.changeMode).not.toHaveBeenCalled()
        expect(replies(dispatched)).toEqual([actions.draw.modeChanged({ sourceId: SOURCE_ID, mode: "simple_select" })])
    })

    test("another tool while drawing switches to it", () => {
        const { store, calls } = setup("draw_polygon")

        store.dispatch(toolbar("point"))

        expect(calls).toEqual(["changeMode:draw_point"])
    })

    test("a tool pressed while a feature is edited in direct_select reports the mode the control is in after it", () => {
        const { store, dispatched, control, calls } = setup("direct_select")
        // The control decides the resulting mode; the listener reports what it reads back, not what it asked for
        vi.mocked(control.getMode).mockReturnValueOnce("direct_select").mockReturnValue("draw_line_string")

        store.dispatch(toolbar("line"))

        expect(calls).toEqual(["changeMode:draw_line_string"])
        expect(replies(dispatched)).toEqual([
            actions.draw.modeChanged({ sourceId: SOURCE_ID, mode: "draw_line_string" }),
        ])
    })

    test("the reported mode is the read-back one even when it differs from the requested mode", () => {
        const { store, dispatched, control } = setup("direct_select")
        vi.mocked(control.getMode).mockReturnValueOnce("direct_select").mockReturnValue("simple_select")

        store.dispatch(toolbar("line"))

        expect(replies(dispatched)).toEqual([actions.draw.modeChanged({ sourceId: SOURCE_ID, mode: "simple_select" })])
    })

    test.each([
        ["trash", "trash"],
        ["combine", "combineFeatures"],
        ["uncombine", "uncombineFeatures"],
    ] as const)("%s calls %s and reports the mode", (action, method) => {
        const { store, dispatched, calls } = setup("simple_select")

        store.dispatch(toolbar(action))

        expect(calls).toEqual([method])
        expect(replies(dispatched)).toEqual([actions.draw.modeChanged({ sourceId: SOURCE_ID, mode: "simple_select" })])
    })

    test("with no control registered, dispatches nothing and does not throw", () => {
        const { store, dispatched } = makeCaptureStore({
            preloadedState: { draw: { sourceId: SOURCE_ID, pending: false, hiddenIds: [] } },
            middleware: listener.middleware,
        })

        expect(() => store.dispatch(toolbar("polygon"))).not.toThrow()
        expect(replies(dispatched)).toEqual([])
    })

    test("after the session ended, does nothing", () => {
        const { control, calls } = makeControl("simple_select")
        cleanups.push(registerDrawControl(SOURCE_ID, control))
        const { store, dispatched } = makeCaptureStore({
            preloadedState: { draw: { pending: false, hiddenIds: [] } },
            middleware: listener.middleware,
        })

        store.dispatch(toolbar("point"))

        expect(calls).toEqual([])
        expect(replies(dispatched)).toEqual([])
    })

    test("for a source other than the drawn one, does nothing", () => {
        const { store, dispatched, calls } = setup("simple_select")
        const other = makeControl("simple_select")
        cleanups.push(registerDrawControl("other", other.control))

        store.dispatch(toolbar("point", "other"))

        expect(calls).toEqual([])
        expect(other.calls).toEqual([])
        expect(replies(dispatched)).toEqual([])
    })
})

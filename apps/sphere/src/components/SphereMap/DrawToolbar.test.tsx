import drawReducer from "@/store/draw"
import { actions } from "@/store/actions"
import { fireEvent, render, screen, within } from "@/test-utils"
import type { DrawActionable } from "@/types"
import { type Middleware, type UnknownAction, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, test } from "vitest"
import { DrawToolbar } from "./DrawToolbar"

const SOURCE_ID = "s1"

const NOTHING: DrawActionable = { trash: false, combineFeatures: false, uncombineFeatures: false }
const EVERYTHING: DrawActionable = { trash: true, combineFeatures: true, uncombineFeatures: true }

const TOOL_TITLES = ["Point (1)", "Line (2)", "Polygon (3)"]
const EDIT_TITLES = ["Delete", "Combine", "Uncombine"]

type Setup = {
    mode?: string
    actionable?: DrawActionable
    blocked?: boolean
    pending?: boolean
}

function isAction(value: unknown): value is UnknownAction {
    return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
}

function renderToolbar({ mode, actionable = NOTHING, blocked = false, pending = false }: Setup = {}) {
    const dispatched: UnknownAction[] = []
    const capture: Middleware = () => next => action => {
        if (isAction(action)) {
            dispatched.push(action)
        }
        return next(action)
    }
    const store = configureStore({
        reducer: { draw: drawReducer },
        preloadedState: {
            draw: { sourceId: SOURCE_ID, pending, hiddenIds: [], mode, actionable },
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(capture),
    })
    render(
        <Provider store={store}>
            <DrawToolbar sourceId={SOURCE_ID} blocked={blocked} pending={pending} />
        </Provider>,
    )
    return { dispatched }
}

function button(name: string) {
    return screen.getByRole("button", { name })
}

describe("DrawToolbar", () => {
    test("is a toolbar named Draw with a Tools group holding the three tools", () => {
        renderToolbar()

        const toolbar = screen.getByRole("toolbar", { name: "Draw" })
        const group = screen.getByRole("group", { name: "Tools" })
        expect(toolbar).toContainElement(group)
        expect(within(group).getAllByRole("button")).toHaveLength(TOOL_TITLES.length)
    })

    test("shows the tools, the edit actions, then Cancel and Done, left to right", () => {
        renderToolbar()

        const names = screen
            .getAllByRole("button")
            .map(element => element.getAttribute("aria-label") ?? element.textContent)

        expect(names).toEqual([...TOOL_TITLES, ...EDIT_TITLES, "Cancel", "Done"])
    })

    test.each([...TOOL_TITLES, ...EDIT_TITLES])("%s shows its name as the tooltip", title => {
        renderToolbar()

        expect(button(title)).toHaveAttribute("title", title)
    })

    test("the tool of the draw mode is pressed, the others are not", () => {
        renderToolbar({ mode: "draw_polygon" })

        expect(button("Polygon (3)")).toHaveAttribute("aria-pressed", "true")
        expect(button("Point (1)")).toHaveAttribute("aria-pressed", "false")
        expect(button("Line (2)")).toHaveAttribute("aria-pressed", "false")
    })

    test.each(["simple_select", "direct_select", undefined])("no tool is pressed in mode %s", mode => {
        renderToolbar({ mode })

        for (const title of TOOL_TITLES) {
            expect(button(title)).toHaveAttribute("aria-pressed", "false")
        }
    })

    test.each(EDIT_TITLES)("%s is an action, not a toggle", title => {
        renderToolbar({ actionable: EVERYTHING })

        expect(button(title)).not.toHaveAttribute("aria-pressed")
    })

    test.each([
        ["Point (1)", "point"],
        ["Line (2)", "line"],
        ["Polygon (3)", "polygon"],
    ] as const)("a click on %s asks the toolbar for %s", (title, action) => {
        const { dispatched } = renderToolbar()

        fireEvent.click(button(title))

        expect(dispatched).toContainEqual(actions.draw.toolbar({ sourceId: SOURCE_ID, action }))
    })

    test("a click on the pressed tool asks the toolbar for that tool again", () => {
        const { dispatched } = renderToolbar({ mode: "draw_polygon" })

        fireEvent.click(button("Polygon (3)"))

        expect(dispatched).toContainEqual(actions.draw.toolbar({ sourceId: SOURCE_ID, action: "polygon" }))
    })

    test.each([
        ["Delete", "trash", { ...NOTHING, trash: true }],
        ["Combine", "combine", { ...NOTHING, combineFeatures: true }],
        ["Uncombine", "uncombine", { ...NOTHING, uncombineFeatures: true }],
    ] as const)("%s is enabled when actionable and asks the toolbar for %s", (title, action, actionable) => {
        const { dispatched } = renderToolbar({ actionable })

        expect(button(title)).toBeEnabled()
        for (const other of EDIT_TITLES.filter(name => name !== title)) {
            expect(button(other)).toBeDisabled()
        }

        fireEvent.click(button(title))

        expect(dispatched).toContainEqual(actions.draw.toolbar({ sourceId: SOURCE_ID, action }))
    })

    test.each(EDIT_TITLES)("%s is disabled when not actionable", title => {
        renderToolbar({ actionable: NOTHING })

        expect(button(title)).toBeDisabled()
    })

    test("everything is enabled when not blocked and everything is actionable", () => {
        renderToolbar({ actionable: EVERYTHING })

        for (const element of screen.getAllByRole("button")) {
            expect(element).toBeEnabled()
        }
    })

    test("Cancel asks to cancel and Done asks to commit the drawn source", () => {
        const { dispatched } = renderToolbar()

        fireEvent.click(button("Cancel"))
        fireEvent.click(button("Done"))

        expect(dispatched).toContainEqual(actions.draw.cancel({ sourceId: SOURCE_ID }))
        expect(dispatched).toContainEqual(actions.draw.commit({ sourceId: SOURCE_ID }))
    })

    test("blocked disables every tool, every edit action and Done, but not Cancel", () => {
        renderToolbar({ actionable: EVERYTHING, mode: "draw_polygon", blocked: true })

        for (const title of [...TOOL_TITLES, ...EDIT_TITLES, "Done"]) {
            expect(button(title)).toBeDisabled()
        }
        expect(button("Cancel")).toBeEnabled()
    })

    test("pending disables Cancel too", () => {
        renderToolbar({ actionable: EVERYTHING, blocked: true, pending: true })

        for (const element of screen.getAllByRole("button")) {
            expect(element).toBeDisabled()
        }
    })
})

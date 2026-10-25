import { makeMvtSource, makeSourceState } from "@/testutils"
import { actions } from "@/store"
import appReducer, { appSlice } from "@/store/app"
import { fireEvent, render, screen, scrollParentOf } from "@/test-utils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import userEvent from "@testing-library/user-event"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import { SourcesTab } from "./SourcesTab"

vi.mock("@/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn(() => Promise.reject(new Error("no backend in tests"))),
}))

const source: Source = {
    id: "s1",
    name: "Roads",
    type: SourceType.Geojson,
    format: "geojson",
    version: 0,
    location: "/tmp/roads.geojson",
    editable: false,
    pending: false,
    meta: {
        columns: {},
        pointsCount: 1,
        multiPointsCount: 0,
        linesCount: 2,
        multiLinesCount: 0,
        polygonsCount: 3,
        multiPolygonsCount: 0,
        collectionsCount: 0,
        nullGeometryCount: 0,
        featuresCount: 6,
    },
}

function makeStore(
    sourceState: ReturnType<typeof makeSourceState> = makeSourceState([source], { selectedIds: ["s1"] }),
) {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }

    const store = configureStore({
        reducer: {
            app: appReducer,
            source: () => sourceState,
            draw: () => ({ sourceId: null, selectedIds: [] }),
            sourceInfo: () => ({ info: {}, stats: {} }),
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })

    return { store, dispatchedActions }
}

function renderTab(sourceState?: ReturnType<typeof makeSourceState>) {
    const { store, dispatchedActions } = makeStore(sourceState)
    render(
        <Provider store={store}>
            <SourcesTab />
        </Provider>,
    )
    return { dispatchedActions }
}

// ActionBar renders its icons first, in item order: delete, zoom
const DELETE_BUTTON_INDEX = 0
const ZOOM_BUTTON_INDEX = 1

function actionAt(index: number) {
    const button = screen.getAllByRole("button").at(index)
    if (!button) throw new Error(`no button at index ${index}`)
    return button
}

describe("SourcesTab", () => {
    it("scrolls the outline instead of pushing the source panel off the sidebar", () => {
        renderTab()
        const item = screen.getByText("Roads")

        expect(scrollParentOf(item)).not.toBeNull()
    })

    it("scrolls the source details", () => {
        renderTab()
        const name = screen.getByDisplayValue("Roads")

        expect(scrollParentOf(name)).not.toBeNull()
    })

    it("keeps the source controls above the scrolling details", () => {
        renderTab()
        const scroller = scrollParentOf(screen.getByDisplayValue("Roads"))
        const controls = scroller?.previousElementSibling
        if (!controls) {
            throw new Error("source controls not found above the scrolling details")
        }

        expect(controls.querySelectorAll("button").length).toBeGreaterThan(0)
        expect(scrollParentOf(controls)).toBeNull()
    })

    it("dispatches setSidebarSections with the clicked section's open flag flipped", () => {
        const { dispatchedActions } = renderTab()

        fireEvent.click(screen.getByRole("button", { name: /Outline/ }))

        const action = dispatchedActions.find(candidate => appSlice.actions.setSidebarSections.match(candidate))
        expect(action).toBeDefined()
        if (action === undefined || !appSlice.actions.setSidebarSections.match(action)) {
            throw new Error("setSidebarSections action not dispatched")
        }

        expect(action.payload.tab).toBe("sources")
        const outline = action.payload.sections.find(section => section.name === "outline")
        expect(outline?.open).toBe(false)
    })

    describe("with a selected source-layer node", () => {
        const mvt = makeMvtSource("m1", { sourceLayers: [{ id: "roads", name: "Roads" }] })
        const childState = () => makeSourceState([mvt], { selectedIds: ["m1/roads"] })

        function clickActionAt(index: number) {
            fireEvent.click(actionAt(index))
        }

        it("zooms to the selected node", () => {
            const { dispatchedActions } = renderTab(childState())

            clickActionAt(ZOOM_BUTTON_INDEX)

            expect(dispatchedActions).toContainEqual(actions.source.zoomTo("m1/roads"))
        })

        it("does not remove the parent source", () => {
            const { dispatchedActions } = renderTab(childState())

            clickActionAt(DELETE_BUTTON_INDEX)

            expect(dispatchedActions).not.toContainEqual(actions.source.removeSource("m1"))
        })

        it("disables the delete button", () => {
            renderTab(childState())

            expect(actionAt(DELETE_BUTTON_INDEX)).toBeDisabled()
            expect(actionAt(ZOOM_BUTTON_INDEX)).toBeEnabled()
        })
    })

    describe("with a selected folder", () => {
        const folderState = () => makeSourceState([source], { folderIds: ["f1"], selectedIds: ["f1"] })

        it("enables delete and disables zoom", () => {
            renderTab(folderState())

            expect(actionAt(DELETE_BUTTON_INDEX)).toBeEnabled()
            expect(actionAt(ZOOM_BUTTON_INDEX)).toBeDisabled()
        })
    })

    it("opens the URL dialog, dispatches addFromUrl with the typed URL and closes", () => {
        const { dispatchedActions } = renderTab()

        fireEvent.click(screen.getByRole("button", { name: "Add from URL" }))
        expect(screen.getByText("Input URL")).toBeInTheDocument()

        fireEvent.change(screen.getByRole("textbox", { name: /^URL/ }), {
            target: { value: "https://example.com/a.geojson" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Submit" }))

        const pending = dispatchedActions.find(candidate => actions.source.addFromUrl.pending.match(candidate))
        if (pending === undefined || !actions.source.addFromUrl.pending.match(pending)) {
            throw new Error("addFromUrl not dispatched")
        }
        expect(pending.meta.arg.url).toBe("https://example.com/a.geojson")
        expect(screen.queryByText("Input URL")).toBeNull()
    })

    it("dispatches nothing and keeps the dialog open when the URL is empty", () => {
        const { dispatchedActions } = renderTab()

        fireEvent.click(screen.getByRole("button", { name: "Add from URL" }))
        fireEvent.click(screen.getByRole("button", { name: "Submit" }))
        fireEvent.change(screen.getByRole("textbox", { name: /^URL/ }), { target: { value: "   " } })
        fireEvent.click(screen.getByRole("button", { name: "Submit" }))

        expect(dispatchedActions.some(candidate => actions.source.addFromUrl.pending.match(candidate))).toBe(false)
        expect(screen.getByText("Input URL")).toBeInTheDocument()
    })

    it("submits when Enter is pressed in the URL field", async () => {
        const user = userEvent.setup()
        const { dispatchedActions } = renderTab()

        await user.click(screen.getByRole("button", { name: "Add from URL" }))
        await user.type(screen.getByRole("textbox", { name: /^URL/ }), "https://example.com/b.geojson{Enter}")

        const pending = dispatchedActions.find(candidate => actions.source.addFromUrl.pending.match(candidate))
        if (pending === undefined || !actions.source.addFromUrl.pending.match(pending)) {
            throw new Error("addFromUrl not dispatched")
        }
        expect(pending.meta.arg.url).toBe("https://example.com/b.geojson")
    })
})

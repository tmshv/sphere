import appReducer, { appSlice } from "@/store/app"
import { fireEvent, render, screen } from "@/test-utils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { SourcesTab } from "./SourcesTab"

const source: Source = {
    id: "s1",
    name: "Roads",
    fractionIndex: 1,
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

function makeStore() {
    const dispatchedActions: unknown[] = []
    const captureMiddleware: Middleware = () => next => action => {
        dispatchedActions.push(action)
        return next(action)
    }

    const store = configureStore({
        reducer: {
            app: appReducer,
            source: () => ({ selectedId: "s1", items: { s1: source }, allIds: ["s1"] }),
            draw: () => ({ sourceId: null, selectedIds: [] }),
            sourceInfo: () => ({ info: {}, stats: {} }),
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })

    return { store, dispatchedActions }
}

function renderTab() {
    const { store, dispatchedActions } = makeStore()
    render(
        <Provider store={store}>
            <SourcesTab />
        </Provider>,
    )
    return { dispatchedActions }
}

function scrollParentOf(element: Element) {
    let node = element.parentElement
    while (node) {
        if (window.getComputedStyle(node).overflowY === "auto") {
            return node
        }
        node = node.parentElement
    }
    return null
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
})

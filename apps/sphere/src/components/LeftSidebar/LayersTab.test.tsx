import appReducer, { appSlice } from "@/store/app"
import { fireEvent, render, screen } from "@/test-utils"
import { LayerType } from "@/types"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { LayersTab } from "./LayersTab"

const layer = {
    id: "l1",
    name: "Roads layer",
    type: LayerType.Point,
    visible: true,
    sourceId: null,
    fractionIndex: 1,
    color: "blue",
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
            layer: () => ({ selectedId: "l1", items: { l1: layer }, allIds: ["l1"] }),
            source: () => ({ selectedId: null, items: {}, allIds: [] }),
        },
        middleware: getDefaultMiddleware => getDefaultMiddleware().concat(captureMiddleware),
    })

    return { store, dispatchedActions }
}

function renderTab() {
    const { store, dispatchedActions } = makeStore()
    render(
        <Provider store={store}>
            <LayersTab />
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

describe("LayersTab", () => {
    it("scrolls the outline instead of pushing the layer panel off the sidebar", () => {
        renderTab()
        const item = screen.getByText("Roads layer")

        expect(scrollParentOf(item)).not.toBeNull()
    })

    it("keeps the layer controls above the scrolling settings", () => {
        renderTab()
        const scroller = scrollParentOf(screen.getByDisplayValue("Roads layer"))
        const controls = scroller?.previousElementSibling
        if (!controls) {
            throw new Error("layer controls not found above the scrolling settings")
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

        expect(action.payload.tab).toBe("layers")
        const outline = action.payload.sections.find(section => section.name === "outline")
        expect(outline?.open).toBe(false)
    })
})

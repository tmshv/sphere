import { render, screen } from "@/test-utils"
import { LayerType } from "@/types"
import { configureStore } from "@reduxjs/toolkit"
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

const makeStore = () =>
    configureStore({
        reducer: {
            app: () => ({ darkTheme: false, zenMode: false }),
            layer: () => ({ selectedId: "l1", items: { l1: layer }, allIds: ["l1"] }),
            source: () => ({ selectedId: null, items: {}, allIds: [] }),
        },
    })

function renderTab() {
    return render(
        <Provider store={makeStore()}>
            <LayersTab />
        </Provider>,
    )
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
})

import { render, screen } from "@/test-utils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { SourcesTab } from "./SourcesTab"

const source: Source = {
    id: "s1",
    name: "Roads",
    fractionIndex: 1,
    type: SourceType.Geojson,
    location: "/tmp/roads.geojson",
    editable: false,
    pending: false,
    meta: {
        columns: {},
        pointsCount: 1,
        linesCount: 2,
        polygonsCount: 3,
    },
}

const makeStore = () =>
    configureStore({
        reducer: {
            source: () => ({ selectedId: "s1", items: { s1: source }, allIds: ["s1"] }),
            draw: () => ({ sourceId: null, selectedIds: [] }),
        },
    })

function renderTab() {
    return render(
        <Provider store={makeStore()}>
            <SourcesTab />
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
})

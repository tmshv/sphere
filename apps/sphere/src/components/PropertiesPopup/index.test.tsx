import { render, screen, scrollParentOf } from "@/test-utils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import PropertiesPopup from "."
import type { PropertiesEntry } from "@/store/properties"

const makeStore = (entries?: PropertiesEntry[]) =>
    configureStore({
        reducer: {
            app: () => ({ mapTool: "info" }),
            properties: () => ({ entries }),
        },
    })

const renderPopup = (entries?: PropertiesEntry[]) =>
    render(
        <Provider store={makeStore(entries)}>
            <PropertiesPopup />
        </Provider>,
    )

const entries: PropertiesEntry[] = [{ id: 1, values: { name: "Alpha" } }]

// The panel is the outermost element that takes the mouse: its parent is the click-through overlay region.
function panelOf(element: HTMLElement): HTMLElement {
    let node = element
    while (node.parentElement && window.getComputedStyle(node.parentElement).pointerEvents !== "none") {
        node = node.parentElement
    }
    return node
}

describe("PropertiesPopup", () => {
    it("renders nothing without entries", () => {
        const { container } = renderPopup()
        expect(container).toBeEmptyDOMElement()
    })

    it("renders the properties of every entry", () => {
        renderPopup(entries)
        expect(screen.getByText("Properties")).toBeInTheDocument()
        expect(screen.getByText("name")).toBeInTheDocument()
        expect(screen.getByText("Alpha")).toBeInTheDocument()
    })

    it("offers to copy every property", () => {
        renderPopup([{ id: 1, values: { name: "Alpha", population: 3 } }])
        expect(screen.getAllByRole("button", { name: "Copy" })).toHaveLength(2)
    })

    it("puts the visible panel directly in the overlay region, with no transparent block around it", () => {
        renderPopup(entries)
        const panel = panelOf(screen.getByText("Properties"))
        const region = panel.parentElement
        if (!region) {
            throw new Error("overlay region not found")
        }
        // The region wrapper is click-through; only its direct child — the panel
        // itself — receives mouse events. Any wrapper in between would blanket
        // the map with an invisible, click-eating block.
        expect(window.getComputedStyle(region).pointerEvents).toBe("none")
        expect(window.getComputedStyle(panel).pointerEvents).toBe("auto")
        expect(window.getComputedStyle(panel).height).not.toBe("100%")
    })

    it("scrolls the list right up to the panel edge, so the overlay scrollbar rides over the inset, not the glyphs", () => {
        renderPopup(entries)
        const panel = panelOf(screen.getByText("Properties"))
        const scroller = scrollParentOf(screen.getByText("Alpha"))
        if (!scroller) {
            throw new Error("the list does not scroll")
        }

        expect(panel.contains(scroller)).toBe(true)
        expect(Number.parseFloat(window.getComputedStyle(panel).paddingRight)).toBe(0)
        expect(Number.parseFloat(window.getComputedStyle(scroller).paddingRight)).toBeGreaterThan(0)
    })
})

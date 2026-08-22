import { render, screen } from "@/test-utils"
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

    it("puts the visible panel directly in the overlay region, with no transparent block around it", () => {
        renderPopup(entries)
        const panel = screen.getByText("Properties").parentElement
        const region = panel?.parentElement
        if (!panel || !region) {
            throw new Error("panel not found")
        }
        // The region wrapper is click-through; only its direct child — the panel
        // itself — receives mouse events. Any wrapper in between would blanket
        // the map with an invisible, click-eating block.
        expect(window.getComputedStyle(region).pointerEvents).toBe("none")
        expect(window.getComputedStyle(panel).pointerEvents).toBe("auto")
        expect(window.getComputedStyle(panel).height).not.toBe("100%")
    })
})

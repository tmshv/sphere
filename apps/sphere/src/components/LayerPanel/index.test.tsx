import { render, screen } from "@/test-utils"
import { LayerType } from "@/types"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { LayerPanel } from "."

const layer = {
    id: "l1",
    name: "Roads layer",
    type: LayerType.Point,
    visible: true,
    sourceId: null,
    fractionIndex: 1,
    color: "blue",
}

const makeStore = (selectedId: string | null) =>
    configureStore({
        reducer: {
            layer: () => ({ selectedId, items: { l1: layer }, allIds: ["l1"] }),
            source: () => ({ selectedId: null, items: {}, allIds: [] }),
        },
    })

function renderPanel(selectedId: string | null = "l1") {
    return render(
        <Provider store={makeStore(selectedId)}>
            <LayerPanel />
        </Provider>,
    )
}

function partsOf(container: HTMLElement) {
    const root = container.firstElementChild
    const header = root?.children[0]
    const body = root?.children[1]
    if (!header || !body) {
        throw new Error("panel is not split into a header and a body")
    }
    return { header, body }
}

describe("LayerPanel", () => {
    it("renders nothing without a selected layer", () => {
        const { container } = renderPanel(null)
        expect(container).toBeEmptyDOMElement()
    })

    it("keeps the layer controls in the part that never scrolls", () => {
        const { container } = renderPanel()
        const { header } = partsOf(container)

        expect(header.querySelectorAll("button").length).toBeGreaterThan(0)
        expect(window.getComputedStyle(header).flexShrink).toBe("0")
        expect(window.getComputedStyle(header).overflowY).not.toBe("auto")
    })

    it("scrolls the layer settings below the controls", () => {
        const { container } = renderPanel()
        const { header, body } = partsOf(container)
        const name = screen.getByDisplayValue("Roads layer")

        expect(body.contains(name)).toBe(true)
        expect(header.contains(name)).toBe(false)
        expect(window.getComputedStyle(body).overflowY).toBe("auto")
        expect(Number.parseFloat(window.getComputedStyle(body).minHeight)).toBe(0)
    })
})

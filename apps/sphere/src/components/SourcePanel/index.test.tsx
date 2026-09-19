import { render, screen } from "@/test-utils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { SourcePanel } from "."

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

const makeStore = (selectedId: string | null) =>
    configureStore({
        reducer: {
            source: () => ({ selectedId, items: { s1: source }, allIds: ["s1"] }),
            draw: () => ({ sourceId: null, selectedIds: [] }),
        },
    })

function renderPanel(selectedId: string | null = "s1") {
    return render(
        <Provider store={makeStore(selectedId)}>
            <SourcePanel />
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

describe("SourcePanel", () => {
    it("renders nothing without a selected source", () => {
        const { container } = renderPanel(null)
        expect(container).toBeEmptyDOMElement()
    })

    it("keeps the source controls in the part that never scrolls", () => {
        const { container } = renderPanel()
        const { header, body } = partsOf(container)

        expect(header.querySelectorAll("button").length).toBeGreaterThan(0)
        expect(body.querySelectorAll("button")).toHaveLength(0)
        expect(window.getComputedStyle(header).flexShrink).toBe("0")
        expect(window.getComputedStyle(header).overflowY).not.toBe("auto")
    })

    it("scrolls the source details below the controls", () => {
        const { container } = renderPanel()
        const { header, body } = partsOf(container)
        const name = screen.getByDisplayValue("Roads")

        expect(body.contains(name)).toBe(true)
        expect(header.contains(name)).toBe(false)
        expect(window.getComputedStyle(body).overflowY).toBe("auto")
        expect(Number.parseFloat(window.getComputedStyle(body).minHeight)).toBe(0)
    })

    it("shows the geometry counts of the source", () => {
        renderPanel()
        expect(screen.getByText("Points=1")).toBeInTheDocument()
        expect(screen.getByText("Lines=2")).toBeInTheDocument()
        expect(screen.getByText("Polygons=3")).toBeInTheDocument()
    })
})

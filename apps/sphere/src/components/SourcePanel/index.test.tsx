import { actions } from "@/store"
import { makeMvtSource, makeSourceState } from "@/testutils"
import { fireEvent, render, screen } from "@/test-utils"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { SourcePanel } from "."

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

const makeStore = (selectedId: string | null) =>
    configureStore({
        reducer: {
            source: () => makeSourceState([source], { selectedIds: selectedId ? [selectedId] : [] }),
            draw: () => ({ sourceId: null, selectedIds: [] }),
            sourceInfo: () => ({ info: {}, stats: {} }),
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
        expect(screen.getByText("Points")).toBeInTheDocument()
        expect(screen.getByText("1")).toBeInTheDocument()
        expect(screen.getByText("Lines")).toBeInTheDocument()
        expect(screen.getByText("2")).toBeInTheDocument()
        expect(screen.getByText("Polygons")).toBeInTheDocument()
        expect(screen.getByText("3")).toBeInTheDocument()
    })

    describe("with a selected source-layer node", () => {
        // Header icons in item order: delete, show properties, add to layer, edit, zoom, reload
        const DELETE_BUTTON_INDEX = 0
        const SHOW_PROPERTIES_BUTTON_INDEX = 1
        const ADD_TO_LAYER_BUTTON_INDEX = 2
        const ZOOM_BUTTON_INDEX = 4
        const CHILD_NODE_ID = "m1/roads"

        function renderChildPanel() {
            const dispatched: unknown[] = []
            const capture: Middleware = () => next => action => {
                dispatched.push(action)
                return next(action)
            }
            const mvt = makeMvtSource("m1", { sourceLayers: [{ id: "roads", name: "Roads" }] })
            const store = configureStore({
                reducer: {
                    source: () => makeSourceState([mvt], { selectedIds: [CHILD_NODE_ID] }),
                    draw: () => ({ sourceId: null, selectedIds: [] }),
                    sourceInfo: () => ({ info: {}, stats: {} }),
                },
                middleware: getDefaultMiddleware => getDefaultMiddleware().concat(capture),
            })
            const { container } = render(
                <Provider store={store}>
                    <SourcePanel />
                </Provider>,
            )
            const { header } = partsOf(container)
            const buttonAt = (index: number) => {
                const button = Array.from(header.querySelectorAll("button")).at(index)
                if (!button) throw new Error(`no header button at index ${index}`)
                return button
            }
            return { dispatched, buttonAt }
        }

        it("disables delete and show properties", () => {
            const { buttonAt } = renderChildPanel()

            expect(buttonAt(DELETE_BUTTON_INDEX)).toBeDisabled()
            expect(buttonAt(SHOW_PROPERTIES_BUTTON_INDEX)).toBeDisabled()
        })

        it("adds a layer for the selected node", () => {
            const { dispatched, buttonAt } = renderChildPanel()

            fireEvent.click(buttonAt(ADD_TO_LAYER_BUTTON_INDEX))

            expect(dispatched).toContainEqual(actions.layer.addBlankLayer(CHILD_NODE_ID))
        })

        it("zooms to the selected node", () => {
            const { dispatched, buttonAt } = renderChildPanel()

            fireEvent.click(buttonAt(ZOOM_BUTTON_INDEX))

            expect(dispatched).toContainEqual(actions.source.zoomTo(CHILD_NODE_ID))
        })
    })

    describe("with a selected folder node", () => {
        function renderFolderPanel() {
            const store = configureStore({
                reducer: {
                    source: () => makeSourceState([source], { folderIds: ["f1"], selectedIds: ["f1"] }),
                    draw: () => ({ sourceId: null, selectedIds: [] }),
                    sourceInfo: () => ({ info: {}, stats: {} }),
                },
            })
            return render(
                <Provider store={store}>
                    <SourcePanel />
                </Provider>,
            )
        }

        it("shows the folder name and its item count under the controls", () => {
            const { container } = renderFolderPanel()
            const { header, body } = partsOf(container)

            expect(header.querySelectorAll("button").length).toBeGreaterThan(0)
            expect(body.contains(screen.getByDisplayValue("Folder f1"))).toBe(true)
            expect(screen.getByText("Items")).toBeInTheDocument()
        })
    })
})

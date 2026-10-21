import type { FormatDetails } from "@/lib/source-reader"
import { render, screen } from "@/test-utils"
import { makeGeojsonSource } from "@/testutils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { KmlSourcePanel } from "./KmlSourcePanel"

const schema = {
    columns: {},
    points_count: 1,
    multi_points_count: 0,
    lines_count: 0,
    multi_lines_count: 0,
    polygons_count: 0,
    multi_polygons_count: 0,
    collections_count: 0,
    null_geometry_count: 0,
    features_count: 1,
}

const source = makeGeojsonSource("s1", { format: "kml", location: "/path/to/s1.kml" })

function renderPanel(details: FormatDetails) {
    const store = configureStore({
        reducer: {
            source: () => ({ selectedId: "s1", items: { s1: source }, allIds: ["s1"] }),
            sourceInfo: () => ({ info: { s1: { file: null, schema, details } }, stats: {} }),
        },
    })
    return render(
        <Provider store={store}>
            <KmlSourcePanel />
        </Provider>,
    )
}

describe("KmlSourcePanel", () => {
    it("shows placemark and folder counts", () => {
        renderPanel({ format: "kml", placemarks: 6, folders: 3, skipped_placemarks: 0 })

        expect(screen.getByText("Placemarks").parentElement).toHaveTextContent("6")
        expect(screen.getByText("Folders").parentElement).toHaveTextContent("3")
        expect(screen.queryByText(/no drawable geometry/)).toBeNull()
    })

    it("shows a skipped-placemarks note when some placemarks have no drawable geometry", () => {
        const { unmount } = renderPanel({ format: "kml", placemarks: 6, folders: 3, skipped_placemarks: 1 })
        expect(
            screen.getByText("1 placemark has no drawable geometry and is not shown on the map."),
        ).toBeInTheDocument()
        unmount()

        renderPanel({ format: "kml", placemarks: 6, folders: 3, skipped_placemarks: 2 })
        expect(
            screen.getByText("2 placemarks have no drawable geometry and are not shown on the map."),
        ).toBeInTheDocument()
    })

    it("renders nothing for non-kml details", () => {
        const { container } = renderPanel({ format: "geojson" })
        expect(container).toBeEmptyDOMElement()
    })
})

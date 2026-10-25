import type { FormatDetails, SourceInfo } from "@/lib/source-reader"
import { render, screen } from "@/test-utils"
import { makeGeojsonSource, makeSourceState } from "@/testutils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { GpxSourcePanel } from "./GpxSourcePanel"

const schema: SourceInfo["schema"] = {
    columns: { name: "string" },
    points_count: 0,
    multi_points_count: 0,
    lines_count: 2,
    multi_lines_count: 1,
    polygons_count: 0,
    multi_polygons_count: 0,
    collections_count: 0,
    null_geometry_count: 0,
    features_count: 2,
}

const meta = {
    columns: { name: "string" },
    pointsCount: 0,
    multiPointsCount: 0,
    linesCount: 2,
    multiLinesCount: 1,
    polygonsCount: 0,
    multiPolygonsCount: 0,
    collectionsCount: 0,
    nullGeometryCount: 0,
    featuresCount: 2,
}

const source = makeGeojsonSource("s1", { format: "gpx", location: "/path/to/s1.gpx", meta })

function renderPanel(details: FormatDetails) {
    const store = configureStore({
        reducer: {
            source: () => makeSourceState([source], { selectedIds: ["s1"] }),
            sourceInfo: () => ({ info: { s1: { file: null, schema, details } }, stats: {} }),
        },
    })
    return render(
        <Provider store={store}>
            <GpxSourcePanel />
        </Provider>,
    )
}

const WARNING = "GPX rendering only supports tracks — waypoints and routes are not drawn on the map."

describe("GpxSourcePanel", () => {
    it("shows the GPX contents and geometry sections", () => {
        renderPanel({ format: "gpx", waypoints: 0, tracks: 4, routes: 0, track_points: 120 })

        expect(screen.getByText("GPX contents")).toBeInTheDocument()
        expect(screen.getByText("Waypoints").parentElement).toHaveTextContent("0")
        expect(screen.getByText("Tracks").parentElement).toHaveTextContent("4")
        expect(screen.getByText("Routes").parentElement).toHaveTextContent("0")
        expect(screen.getByText("Track points").parentElement).toHaveTextContent("120")
        expect(screen.getByText("Geometry")).toBeInTheDocument()
        expect(screen.getByText("Attributes")).toBeInTheDocument()
        expect(screen.queryByText(WARNING)).toBeNull()
    })

    it("warns that waypoints are not drawn", () => {
        renderPanel({ format: "gpx", waypoints: 2, tracks: 1, routes: 0, track_points: 10 })
        expect(screen.getByText(WARNING)).toBeInTheDocument()
    })

    it("warns that routes are not drawn", () => {
        renderPanel({ format: "gpx", waypoints: 0, tracks: 1, routes: 3, track_points: 10 })
        expect(screen.getByText(WARNING)).toBeInTheDocument()
    })

    it("renders nothing for non-gpx details", () => {
        const { container } = renderPanel({ format: "geojson" })
        expect(container).toBeEmptyDOMElement()
    })
})

import type { FormatDetails, SourceInfo } from "@/lib/source-reader"
import { render, screen } from "@/test-utils"
import { makeGeojsonSource, makeSourceState } from "@/testutils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { CsvSourcePanel } from "./CsvSourcePanel"

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

const source = makeGeojsonSource("s1", { format: "csv", location: "/path/to/s1.csv", meta })

function renderPanel(details: FormatDetails) {
    const store = configureStore({
        reducer: {
            source: () => makeSourceState([source], { selectedIds: ["s1"] }),
            sourceInfo: () => ({ info: { s1: { file: null, schema, details } }, stats: {} }),
        },
    })
    return render(
        <Provider store={store}>
            <CsvSourcePanel />
        </Provider>,
    )
}

const csvDetails: FormatDetails = {
    format: "csv",
    mode: "xy",
    wkt_column: null,
    x_column: "lng",
    y_column: "lat",
    header_columns: ["name", "lng", "lat"],
    parsed_rows: 8,
    skipped_rows: 0,
}

describe("CsvSourcePanel", () => {
    it("shows the geometry source and parsing sections", () => {
        renderPanel(csvDetails)

        expect(screen.getByText("Geometry source")).toBeInTheDocument()
        expect(screen.getByText("Parsing")).toBeInTheDocument()
        expect(screen.getByText("Rows with geometry").parentElement).toHaveTextContent("8")
        expect(screen.getByText("Rows skipped").parentElement).toHaveTextContent("0")
        expect(screen.getByText("Geometry")).toBeInTheDocument()
        expect(screen.getByText("Attributes")).toBeInTheDocument()
        expect(screen.queryByText(/rows had valid geometry/)).toBeNull()
    })

    it("explains how many rows had valid geometry when some were skipped", () => {
        renderPanel({ ...csvDetails, parsed_rows: 8, skipped_rows: 2 })
        expect(screen.getByText("8 of 10 rows had valid geometry")).toBeInTheDocument()
    })

    it("renders nothing for non-csv details", () => {
        const { container } = renderPanel({ format: "geojson" })
        expect(container).toBeEmptyDOMElement()
    })
})

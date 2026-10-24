import type { FormatDetails, SourceInfo } from "@/lib/source-reader"
import { render, screen } from "@/test-utils"
import { makeGeojsonSource } from "@/testutils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { ShapefileSourcePanel } from "./ShapefileSourcePanel"

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

const source = makeGeojsonSource("s1", { format: "shapefile", location: "/path/to/s1.shp", meta })

function renderPanel(details: FormatDetails) {
    const store = configureStore({
        reducer: {
            source: () => ({ selectedId: "s1", items: { s1: source }, allIds: ["s1"] }),
            sourceInfo: () => ({ info: { s1: { file: null, schema, details } }, stats: {} }),
        },
    })
    return render(
        <Provider store={store}>
            <ShapefileSourcePanel />
        </Provider>,
    )
}

const NO_DBF = "No .dbf sidecar — this shapefile has no attributes"

describe("ShapefileSourcePanel", () => {
    it("shows which sidecars are present and the CRS", () => {
        renderPanel({
            format: "shapefile",
            has_dbf: true,
            has_shx: true,
            has_prj: false,
            has_cpg: false,
            crs: "EPSG:4326",
        })

        expect(screen.getByText("Sidecars & CRS")).toBeInTheDocument()
        expect(screen.getByText(".dbf").parentElement).toHaveTextContent("present")
        expect(screen.getByText(".shx").parentElement).toHaveTextContent("present")
        expect(screen.getByText(".prj").parentElement).toHaveTextContent("missing")
        expect(screen.getByText(".cpg").parentElement).toHaveTextContent("missing")
        expect(screen.getByText("CRS").parentElement).toHaveTextContent("EPSG:4326")
        expect(screen.getByText("Geometry")).toBeInTheDocument()
        expect(screen.getByText("Attributes")).toBeInTheDocument()
        expect(screen.queryByText(NO_DBF)).toBeNull()
    })

    it("warns when the dbf sidecar is missing and shows an unknown CRS", () => {
        renderPanel({
            format: "shapefile",
            has_dbf: false,
            has_shx: true,
            has_prj: false,
            has_cpg: false,
            crs: null,
        })

        expect(screen.getByText(NO_DBF)).toBeInTheDocument()
        expect(screen.getByText("CRS").parentElement).toHaveTextContent("unknown")
    })

    it("renders nothing for non-shapefile details", () => {
        const { container } = renderPanel({ format: "geojson" })
        expect(container).toBeEmptyDOMElement()
    })
})

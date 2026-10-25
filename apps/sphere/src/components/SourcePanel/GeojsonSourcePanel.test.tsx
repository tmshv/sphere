import type { SourceInfo } from "@/lib/source-reader"
import { render, screen } from "@/test-utils"
import { makeGeojsonSource, makeSourceState } from "@/testutils"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { describe, expect, it } from "vitest"
import { GeojsonSourcePanel } from "./GeojsonSourcePanel"

const meta = {
    columns: { name: "string" },
    pointsCount: 3,
    multiPointsCount: 0,
    linesCount: 0,
    multiLinesCount: 0,
    polygonsCount: 0,
    multiPolygonsCount: 0,
    collectionsCount: 0,
    nullGeometryCount: 0,
    featuresCount: 3,
}

function renderPanel(file: SourceInfo["file"]) {
    const source = makeGeojsonSource("s1", { meta })
    const store = configureStore({
        reducer: {
            source: () => makeSourceState([source], { selectedIds: ["s1"] }),
            sourceInfo: () => ({ info: { s1: { file, schema: {}, details: { format: "geojson" } } }, stats: {} }),
        },
    })
    return render(
        <Provider store={store}>
            <GeojsonSourcePanel />
        </Provider>,
    )
}

describe("GeojsonSourcePanel", () => {
    it("shows the geometry and attributes sections", () => {
        renderPanel(null)

        expect(screen.getByText("Geometry")).toBeInTheDocument()
        expect(screen.getByText("Features").parentElement).toHaveTextContent("3")
        expect(screen.getByText("Points").parentElement).toHaveTextContent("3")
        expect(screen.getByText("Attributes")).toBeInTheDocument()
        expect(screen.queryByText("File")).toBeNull()
    })

    it("shows the file section when file info is known", () => {
        renderPanel({ size_bytes: 2048, modified: null })

        expect(screen.getByText("File")).toBeInTheDocument()
        expect(screen.getByText("Size")).toBeInTheDocument()
    })
})

import { render, screen } from "@/test-utils"
import type { SourceMetadata } from "@/types"
import { describe, expect, it } from "vitest"
import { GeometryCounts } from "./GeometryCounts"

const EMPTY_META: SourceMetadata = {
    columns: {},
    pointsCount: 0,
    multiPointsCount: 0,
    linesCount: 0,
    multiLinesCount: 0,
    polygonsCount: 0,
    multiPolygonsCount: 0,
    collectionsCount: 0,
    nullGeometryCount: 0,
    featuresCount: 0,
}

describe("GeometryCounts", () => {
    it("shows only the feature total when there are no geometries", () => {
        render(<GeometryCounts meta={EMPTY_META} />)

        expect(screen.getByText("Features").parentElement).toHaveTextContent("0")
        expect(screen.queryByText("Points")).toBeNull()
        expect(screen.queryByText("Lines")).toBeNull()
        expect(screen.queryByText("Polygons")).toBeNull()
        expect(screen.queryByText("Collections")).toBeNull()
        expect(screen.queryByText("No geometry")).toBeNull()
    })

    it("shows each geometry bucket that is not empty, with its multi count", () => {
        render(
            <GeometryCounts
                meta={{
                    ...EMPTY_META,
                    featuresCount: 20,
                    pointsCount: 5,
                    multiPointsCount: 2,
                    linesCount: 4,
                    polygonsCount: 7,
                    multiPolygonsCount: 1,
                    collectionsCount: 3,
                    nullGeometryCount: 1,
                }}
            />,
        )

        expect(screen.getByText("Features").parentElement).toHaveTextContent("20")
        expect(screen.getByText("Points").parentElement).toHaveTextContent("5 (2 multi)")
        expect(screen.getByText("Lines").parentElement).toHaveTextContent("4")
        expect(screen.getByText("Lines").parentElement).not.toHaveTextContent("multi")
        expect(screen.getByText("Polygons").parentElement).toHaveTextContent("7 (1 multi)")
        expect(screen.getByText("Collections").parentElement).toHaveTextContent("3")
        expect(screen.getByText("No geometry").parentElement).toHaveTextContent("1")
    })
})

import type { FileInfo } from "@/lib/source-reader"
import type { SourceMetadata } from "@/types"
import type { TileJSON } from "@/types/tilejson"
import { formatBytes, formatEpoch } from "@sphere/utils"
import { describe, expect, it } from "vitest"
import { sidecarItems } from "./ShapefileSourcePanel"
import { fileItems } from "./parts/FileSection"
import { geometryItems } from "./parts/GeometryCounts"
import { tileJsonItems } from "./parts/TileJsonSection"

const META: SourceMetadata = {
    columns: {},
    pointsCount: 0,
    multiPointsCount: 0,
    linesCount: 2,
    multiLinesCount: 0,
    polygonsCount: 3,
    multiPolygonsCount: 1,
    collectionsCount: 0,
    nullGeometryCount: 4,
    featuresCount: 9,
}

const TILEJSON: TileJSON = {
    tilejson: "3.0.0",
    tiles: ["https://example.com/{z}/{x}/{y}.pbf"],
    attribution: null,
    description: null,
    legend: null,
    template: null,
    name: null,
}
const SIZE_BYTES = 2048
const MODIFIED = "1700000000"

function names(items: ReadonlyArray<{ name: string }>): string[] {
    return items.map(item => item.name)
}

describe("geometryItems", () => {
    it("starts with the feature count and lists only the geometry kinds the source has", () => {
        expect(geometryItems(META)).toEqual([
            { name: "Features", value: 9 },
            { name: "Lines", value: "2" },
            { name: "Polygons", value: "3 (1 multi)" },
            { name: "No geometry", value: 4 },
        ])
    })
})

describe("tileJsonItems", () => {
    it("always has the zoom range, from the defaults when the TileJSON has none", () => {
        expect(tileJsonItems(TILEJSON)).toEqual([{ name: "Zoom", value: "0–22" }])
    })

    it("puts the format before the zoom range and the other metadata after it", () => {
        const items = tileJsonItems({
            ...TILEJSON,
            format: "pbf",
            minzoom: 2,
            maxzoom: 14,
            bounds: [1, 2, 3, 4],
            attribution: "© OSM",
        })

        expect(names(items)).toEqual(["Format", "Zoom", "Bounds", "Attribution"])
        expect(items.at(2)?.value).toBe("1, 2, 3, 4")
    })
})

describe("fileItems", () => {
    it("has the size, and the modification date when it is known", () => {
        const file: FileInfo = { size_bytes: SIZE_BYTES, modified: MODIFIED }

        expect(fileItems(file)).toEqual([
            { name: "Size", value: formatBytes(SIZE_BYTES) },
            { name: "Modified", value: formatEpoch(MODIFIED) },
        ])
        expect(names(fileItems({ ...file, modified: null }))).toEqual(["Size"])
    })
})

describe("sidecarItems", () => {
    it("says whether each sidecar is present, then the CRS", () => {
        const items = sidecarItems({
            format: "shapefile",
            has_dbf: true,
            has_shx: false,
            has_prj: true,
            has_cpg: false,
            crs: null,
        })

        expect(items).toEqual([
            { name: ".dbf", value: "present" },
            { name: ".shx", value: "missing" },
            { name: ".prj", value: "present" },
            { name: ".cpg", value: "missing" },
            { name: "CRS", value: "unknown" },
        ])
    })
})

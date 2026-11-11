import type { Source } from "@/types/source"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { demEncodingOf, hillshadeDemSourceId, terrainDemSourceId } from "./terrain"

function makeRaster(dem?: "terrarium" | "mapbox"): Source {
    return {
        id: "r",
        name: "r",
        type: SourceType.Raster,
        location: "https://example.com/tiles.json",
        editable: false,
        pending: false,
        dem,
    }
}

function makeMbtiles(format: "pbf" | "png" | "jpg" | "webp"): Source {
    return {
        id: "m",
        name: "m",
        type: SourceType.MVT,
        location: "/path/m.mbtiles",
        editable: false,
        pending: false,
        format,
        tilejson: {
            tilejson: "3.0.0",
            tiles: [],
            attribution: null,
            description: null,
            legend: null,
            name: null,
            template: null,
        },
        sourceLayers: [],
    }
}

function makeFeatureCollection(): Source {
    return {
        id: "f",
        name: "f",
        type: SourceType.FeatureCollection,
        location: "sphere://f",
        editable: true,
        pending: true,
    }
}

const geojson: Source = {
    id: "g",
    name: "g",
    type: SourceType.Geojson,
    format: "geojson",
    location: "/path/g.geojson",
    version: 0,
    editable: false,
    pending: false,
    meta: {
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
    },
}

describe("demEncodingOf", () => {
    test.each(["png", "webp", "jpg"] as const)("is terrarium for an MBTiles source with format %s", format => {
        expect(demEncodingOf(makeMbtiles(format))).toBe("terrarium")
    })

    test("is null for a pbf MBTiles source", () => {
        expect(demEncodingOf(makeMbtiles("pbf"))).toBeNull()
    })

    test("is null for GeoJSON and FeatureCollection sources", () => {
        expect(demEncodingOf(geojson)).toBeNull()
        expect(demEncodingOf(makeFeatureCollection())).toBeNull()
    })

    test("is null for a raster without dem and for a missing source", () => {
        expect(demEncodingOf(makeRaster())).toBeNull()
        expect(demEncodingOf(undefined)).toBeNull()
    })

    test("returns the dem encoding of a raster", () => {
        expect(demEncodingOf(makeRaster("terrarium"))).toBe("terrarium")
        expect(demEncodingOf(makeRaster("mapbox"))).toBe("mapbox")
    })
})

describe("dem source ids", () => {
    test("are derived from the source id", () => {
        expect(terrainDemSourceId("a")).toBe("terrain-dem-a")
        expect(hillshadeDemSourceId("a")).toBe("hillshade-dem-a")
    })
})

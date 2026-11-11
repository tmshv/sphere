import type { RasterSource, Source } from "@/types/source"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import {
    HILLSHADE_LAYER_ID,
    demEncodingOf,
    demSourceProps,
    hillshadeDemSourceId,
    hillshadePlacement,
    terrainDemSourceId,
} from "./terrain"

function makeRaster(dem?: "terrarium" | "mapbox"): RasterSource & { id: string; name: string } {
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

describe("demSourceProps", () => {
    test("serves a raster MBTiles source from its sphere TileJSON", () => {
        expect(demSourceProps(makeMbtiles("png"), "terrarium")).toEqual({
            type: "raster-dem",
            url: "sphere://m/tilejson",
            tileSize: 256,
            encoding: "terrarium",
        })
    })

    test("serves a web raster straight from its XYZ tiles", () => {
        const tiles = { urls: ["https://t.example/{z}/{x}/{y}.webp"], tileSize: 512, maxzoom: 12, attribution: "A" }
        expect(demSourceProps({ ...makeRaster("terrarium"), tiles }, "terrarium")).toEqual({
            type: "raster-dem",
            tiles: tiles.urls,
            tileSize: 512,
            maxzoom: 12,
            attribution: "A",
            encoding: "terrarium",
        })
    })

    test("points a TileJSON raster at its location", () => {
        expect(demSourceProps(makeRaster("mapbox"), "mapbox")).toEqual({
            type: "raster-dem",
            url: "https://example.com/tiles.json",
            encoding: "mapbox",
        })
    })

    test("is null for a source that cannot hold elevation tiles", () => {
        expect(demSourceProps(geojson, "terrarium")).toBeNull()
    })
})

function layer(id: string, type: string) {
    return { id, type }
}

describe("hillshadePlacement", () => {
    test("goes under the lowest vector when every raster is below the vectors", () => {
        const order = [layer("osm", "raster"), layer("dem", "raster"), layer("a", "fill"), layer("b", "line")]
        expect(hillshadePlacement(order)).toBe("a")
    })

    test("goes on top when the topmost raster is the top layer", () => {
        expect(hillshadePlacement([layer("a", "fill"), layer("osm", "raster")])).toBeUndefined()
    })

    test("goes directly above the topmost raster", () => {
        const order = [layer("a", "fill"), layer("osm", "raster"), layer("b", "circle")]
        expect(hillshadePlacement(order)).toBe("b")
    })

    test("goes to the bottom without a raster layer", () => {
        expect(hillshadePlacement([layer("a", "fill"), layer("b", "line")])).toBe("a")
    })

    test("is undefined on an empty map", () => {
        expect(hillshadePlacement([])).toBeUndefined()
    })

    test("ignores the hillshade layer itself", () => {
        const hillshade = layer(HILLSHADE_LAYER_ID, "hillshade")
        expect(hillshadePlacement([layer("osm", "raster"), hillshade, layer("a", "fill")])).toBe("a")
        expect(hillshadePlacement([layer("osm", "raster"), hillshade])).toBeUndefined()
        expect(hillshadePlacement([hillshade, layer("a", "fill")])).toBe("a")
        expect(hillshadePlacement([layer("a", "fill"), hillshade])).toBe("a")
    })
})

import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import type { TileJSON } from "@/types/tilejson"
import { describe, expect, test } from "vitest"
import { hasFeatureStore, isMvtSource } from "./source"

const meta = {
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

const tilejson: TileJSON = {
    tilejson: "3.0.0",
    tiles: [],
    vector_layers: [],
    attribution: null,
    description: null,
    legend: null,
    template: null,
    name: null,
}

const geojson: Source = {
    id: "g1",
    name: "GeoJSON",
    type: SourceType.Geojson,
    format: "geojson",
    location: "/tmp/g1.geojson",
    version: 0,
    editable: false,
    pending: false,
    meta,
}
const featureCollection: Source = {
    id: "fc1",
    name: "Features",
    type: SourceType.FeatureCollection,
    location: "sphere://fc1",
    version: 0,
    editable: true,
    pending: false,
    meta,
}
const pendingFeatureCollection: Source = {
    id: "fc2",
    name: "Pending",
    type: SourceType.FeatureCollection,
    editable: true,
    pending: true,
}
const mvt: Source = {
    id: "m1",
    name: "Tiles",
    type: SourceType.MVT,
    location: "/tmp/m1.mbtiles",
    tilejson,
    format: "pbf",
    editable: false,
    sourceLayers: [],
    pending: false,
}
const raster: Source = {
    id: "r1",
    name: "Raster",
    type: SourceType.Raster,
    location: "/tmp/r1.mbtiles",
    editable: false,
    pending: false,
}

describe("isMvtSource", () => {
    test("is true for an MVT source", () => {
        expect(isMvtSource(mvt)).toBe(true)
    })

    test("is false for other sources and for no source", () => {
        expect(isMvtSource(geojson)).toBe(false)
        expect(isMvtSource(undefined)).toBe(false)
    })
})

describe("hasFeatureStore", () => {
    test("is true for a GeoJSON source", () => {
        expect(hasFeatureStore(geojson)).toBe(true)
    })

    test("is true for a loaded FeatureCollection source", () => {
        expect(hasFeatureStore(featureCollection)).toBe(true)
    })

    test("is false for a pending FeatureCollection source", () => {
        expect(hasFeatureStore(pendingFeatureCollection)).toBe(false)
    })

    test("is false for tile sources", () => {
        expect(hasFeatureStore(mvt)).toBe(false)
        expect(hasFeatureStore(raster)).toBe(false)
    })

    test("is false for no source", () => {
        expect(hasFeatureStore(undefined)).toBe(false)
    })
})

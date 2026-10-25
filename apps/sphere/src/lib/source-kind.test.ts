import { EMPTY_SOURCE_METADATA } from "@/lib/source-metadata"
import { type SourceFormat, type SourceNode, SourceType } from "@/types"
import type { Source, VectorSource } from "@/types/source"
import { describe, expect, test } from "vitest"
import { sourceKindOf } from "./source-kind"

const sourceNode: SourceNode = { id: "s1", name: "S1", visible: true, children: [], kind: "source" }
const layerNode: SourceNode = {
    id: "m1/roads",
    name: "roads",
    parentId: "m1",
    visible: true,
    children: [],
    kind: "source-layer",
    sourceLayer: "roads",
}
const folderNode: SourceNode = { id: "f1", name: "F1", visible: true, children: [], kind: "folder" }

function geojson(format: SourceFormat): Source {
    return {
        id: "s1",
        name: "S1",
        type: SourceType.Geojson,
        format,
        location: "",
        version: 0,
        editable: false,
        pending: false,
        meta: EMPTY_SOURCE_METADATA,
    }
}

function tiles(format: VectorSource["format"]): Source {
    return {
        id: "s1",
        name: "S1",
        type: SourceType.MVT,
        format,
        location: "",
        editable: false,
        pending: false,
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

const featureCollection: Source = {
    id: "s1",
    name: "New",
    type: SourceType.FeatureCollection,
    location: "",
    version: 0,
    editable: true,
    pending: false,
    meta: EMPTY_SOURCE_METADATA,
}

const raster: Source = {
    id: "s1",
    name: "Raster",
    type: SourceType.Raster,
    location: "",
    editable: false,
    pending: false,
}

describe("sourceKindOf", () => {
    test("child and folder nodes are their own kind, whatever the source", () => {
        expect(sourceKindOf(layerNode, tiles("pbf"))).toBe("source-layer")
        expect(sourceKindOf(folderNode, undefined)).toBe("folder")
    })

    test("feature sources take their file format", () => {
        expect(sourceKindOf(sourceNode, geojson("geojson"))).toBe("geojson")
        expect(sourceKindOf(sourceNode, geojson("csv"))).toBe("csv")
        expect(sourceKindOf(sourceNode, geojson("kml"))).toBe("kml")
        expect(sourceKindOf(sourceNode, featureCollection)).toBe("geojson")
    })

    test("tile sources split into vector and raster tiles", () => {
        expect(sourceKindOf(sourceNode, tiles("pbf"))).toBe("vector-tiles")
        expect(sourceKindOf(sourceNode, tiles("png"))).toBe("raster-tiles")
        expect(sourceKindOf(sourceNode, raster)).toBe("raster-tiles")
    })

    test("a source node without a source item has no kind", () => {
        expect(sourceKindOf(sourceNode, undefined)).toBeNull()
        expect(sourceKindOf(undefined, undefined)).toBeNull()
    })
})

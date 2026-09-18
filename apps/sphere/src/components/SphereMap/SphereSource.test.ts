import { EMPTY_SOURCE_METADATA } from "@/lib/source-metadata"
import { SourceType } from "@/types"
import type { Source } from "@/types/source"
import { describe, expect, test } from "vitest"
import { selectSourceVersion } from "./SphereSource"

const geojsonSource: Source = {
    id: "s1",
    name: "Source s1",
    type: SourceType.Geojson,
    format: "geojson",
    location: "/path/to/s1.geojson",
    version: 3,
    fractionIndex: 0,
    editable: false,
    pending: false,
    meta: EMPTY_SOURCE_METADATA,
}

const featureCollectionSource: Source = {
    id: "s2",
    name: "Source s2",
    type: SourceType.FeatureCollection,
    location: "sphere://s2",
    version: 7,
    fractionIndex: 0,
    editable: true,
    pending: false,
    meta: EMPTY_SOURCE_METADATA,
}

const pendingSource: Source = {
    id: "s3",
    name: "Source s3",
    type: SourceType.FeatureCollection,
    fractionIndex: 0,
    editable: true,
    pending: true,
}

const rasterSource: Source = {
    id: "s4",
    name: "Source s4",
    type: SourceType.Raster,
    location: "https://tiles.example/{z}/{x}/{y}.png",
    fractionIndex: 0,
    editable: false,
    pending: false,
}

describe("selectSourceVersion", () => {
    test("returns the version for a Geojson source", () => {
        expect(selectSourceVersion(geojsonSource)).toBe(3)
    })

    test("returns the version for a FeatureCollection source", () => {
        expect(selectSourceVersion(featureCollectionSource)).toBe(7)
    })

    test("returns null for a pending FeatureCollection source", () => {
        expect(selectSourceVersion(pendingSource)).toBeNull()
    })

    test("returns null for a source with no version concept", () => {
        expect(selectSourceVersion(rasterSource)).toBeNull()
    })

    test("returns null when the source is absent", () => {
        expect(selectSourceVersion(undefined)).toBeNull()
    })
})

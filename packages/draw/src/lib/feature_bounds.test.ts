import { describe, expect, it } from "vitest"
import featureBounds from "./feature_bounds"
import getGeoJSON from "../test-utils/get_geojson"

describe("featureBounds", () => {
    it("bounds a point", () => {
        expect(featureBounds(getGeoJSON("point"))).toEqual([10, 10, 10, 10])
    })

    it("bounds a line", () => {
        expect(featureBounds(getGeoJSON("line"))).toEqual([0, 0, 2, 2])
    })

    it("bounds a polygon", () => {
        expect(featureBounds(getGeoJSON("polygon"))).toEqual([30, 20, 70, 40])
    })

    it("bounds a multipolygon across all its polygons", () => {
        expect(featureBounds(getGeoJSON("multiPolygon2"))).toEqual([1, 1, 70, 40])
    })

    it("bounds negative coordinates", () => {
        expect(featureBounds(getGeoJSON("multiPoint"))).toEqual([-10, -10, -5, -5])
    })
})

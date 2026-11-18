import { describe, expect, it } from "vitest"
import type { Feature, FeatureCollection, GeometryCollection, Point } from "geojson"
import normalize, { type DrawInput } from "./normalize"

const point: Point = { type: "Point", coordinates: [1, 2] }
const feature: Feature<Point> = { type: "Feature", properties: { a: 1 }, geometry: point }

/** Input that is not GeoJSON Draw accepts. `JSON.parse` is untyped, so no cast is needed to pass it in. */
function invalidInput(json: string): DrawInput {
    return JSON.parse(json)
}

describe("normalize", () => {
    it("wraps a geometry into a feature collection", () => {
        expect(normalize(point)).toEqual({
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: point }],
        })
    })

    it("wraps a geometry collection like any geometry", () => {
        const collection: GeometryCollection = { type: "GeometryCollection", geometries: [point] }
        expect(normalize(collection)).toEqual({
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: collection }],
        })
    })

    it("wraps a feature into a feature collection", () => {
        expect(normalize(feature)).toEqual({ type: "FeatureCollection", features: [feature] })
    })

    it("returns a feature collection as is", () => {
        const collection: FeatureCollection = { type: "FeatureCollection", features: [feature] }
        expect(normalize(collection)).toBe(collection)
    })

    it("returns null for invalid input", () => {
        expect(normalize(null)).toBeNull()
        expect(normalize(invalidInput("{}"))).toBeNull()
        expect(normalize(invalidInput('{"type":"Nope"}'))).toBeNull()
    })
})

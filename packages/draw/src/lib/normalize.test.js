import { describe, expect, it } from "vitest"
import normalize from "./normalize"

const point = { type: "Point", coordinates: [1, 2] }
const feature = { type: "Feature", properties: { a: 1 }, geometry: point }

describe("normalize", () => {
    it("wraps a geometry into a feature collection", () => {
        expect(normalize(point)).toEqual({
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: point }],
        })
    })

    it("wraps a geometry collection like any geometry", () => {
        const collection = { type: "GeometryCollection", geometries: [point] }
        expect(normalize(collection)).toEqual({
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: collection }],
        })
    })

    it("wraps a feature into a feature collection", () => {
        expect(normalize(feature)).toEqual({ type: "FeatureCollection", features: [feature] })
    })

    it("returns a feature collection as is", () => {
        const collection = { type: "FeatureCollection", features: [feature] }
        expect(normalize(collection)).toBe(collection)
    })

    it("returns null for invalid input", () => {
        expect(normalize(null)).toBeNull()
        expect(normalize({})).toBeNull()
        expect(normalize({ type: "Nope" })).toBeNull()
    })
})

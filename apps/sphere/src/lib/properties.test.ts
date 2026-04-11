import { describe, expect, it } from "vitest"
import { toPropertiesEntries } from "./properties"

const point: GeoJSON.Geometry = { type: "Point", coordinates: [0, 0] }

function feature(id: string | number | undefined, properties: GeoJSON.GeoJsonProperties): GeoJSON.Feature {
    return { type: "Feature", geometry: point, id, properties }
}

describe("toPropertiesEntries", () => {
    it("converts features with IDs to entries", () => {
        const features = [feature(1, { name: "A" }), feature(2, { name: "B" })]
        expect(toPropertiesEntries(features)).toEqual([
            { id: 1, values: { name: "A" } },
            { id: 2, values: { name: "B" } },
        ])
    })

    it("skips features without IDs", () => {
        const features = [feature(1, { name: "A" }), feature(undefined, { name: "B" })]
        expect(toPropertiesEntries(features)).toEqual([{ id: 1, values: { name: "A" } }])
    })

    it("uses empty object for null properties", () => {
        expect(toPropertiesEntries([feature(1, null)])).toEqual([{ id: 1, values: {} }])
    })

    it("returns empty array for empty input", () => {
        expect(toPropertiesEntries([])).toEqual([])
    })

    it("handles string IDs", () => {
        expect(toPropertiesEntries([feature("abc", { x: 1 })])).toEqual([{ id: "abc", values: { x: 1 } }])
    })
})

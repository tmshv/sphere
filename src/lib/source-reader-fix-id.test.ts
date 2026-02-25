import { vi, describe, test, expect, beforeEach } from "vitest"

vi.mock("./nextId", () => ({
    nextNumber: vi.fn().mockReturnValue(42),
}))

import SourceReaderFixId from "./source-reader-fix-id"
import { nextNumber } from "./nextId"

describe("SourceReaderFixId.fixIds", () => {
    let reader: SourceReaderFixId

    beforeEach(() => {
        reader = new SourceReaderFixId("sphere://source/test")
        vi.mocked(nextNumber).mockReturnValue(42)
    })

    test("features with numeric ids are left unchanged", () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: 123,
                    properties: { name: "test" },
                    geometry: { type: "Point", coordinates: [0, 0] },
                },
            ],
        }
        reader.fixIds(fc)
        expect(fc.features[0].id).toBe(123)
        expect(fc.features[0].properties?.name).toBe("test")
        expect(fc.features[0].properties?.$id).toBeUndefined()
    })

    test("features with string ids get id replaced with number from nextNumber", () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "abc",
                    properties: { name: "test" },
                    geometry: { type: "Point", coordinates: [0, 0] },
                },
            ],
        }
        reader.fixIds(fc)
        expect(fc.features[0].id).toBe(42)
        expect(fc.features[0].properties?.$id).toBe("abc")
    })

    test("features with null properties get properties object created", () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "xyz",
                    properties: null,
                    geometry: { type: "Point", coordinates: [0, 0] },
                },
            ],
        }
        reader.fixIds(fc)
        expect(fc.features[0].properties).not.toBeNull()
        expect(fc.features[0].properties?.$id).toBe("xyz")
        expect(fc.features[0].id).toBe(42)
    })

    test("multiple features with mixed id types are processed correctly", () => {
        vi.mocked(nextNumber)
            .mockReturnValueOnce(10)
            .mockReturnValueOnce(11)

        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: 99,
                    properties: {},
                    geometry: { type: "Point", coordinates: [0, 0] },
                },
                {
                    type: "Feature",
                    id: "string-id",
                    properties: {},
                    geometry: { type: "Point", coordinates: [1, 1] },
                },
                {
                    type: "Feature",
                    id: "another-string",
                    properties: null,
                    geometry: { type: "Point", coordinates: [2, 2] },
                },
            ],
        }
        reader.fixIds(fc)

        // numeric id unchanged
        expect(fc.features[0].id).toBe(99)
        expect(fc.features[0].properties?.$id).toBeUndefined()

        // string id replaced
        expect(fc.features[1].id).toBe(10)
        expect(fc.features[1].properties?.$id).toBe("string-id")

        // string id with null properties
        expect(fc.features[2].id).toBe(11)
        expect(fc.features[2].properties?.$id).toBe("another-string")
    })
})

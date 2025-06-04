import { createSourceMetadataFromFeatureCollection } from "./source-metadata"

describe("createSourceMetadataFromFeatureCollection", () => {
    it("should count points correctly", () => {
        const fc = {
            type: "FeatureCollection",
            features: [
                {
                    geometry: { type: "Point" },
                },
                {
                    geometry: { type: "MultiPoint" },
                },
            ],
        }

        const result = createSourceMetadataFromFeatureCollection(fc as GeoJSON.FeatureCollection)
        expect(result).toEqual({ pointsCount: 2, linesCount: 0, polygonsCount: 0 })
    })

    it("should count lines correctly", () => {
        const fc = {
            type: "FeatureCollection",
            features: [
                {
                    geometry: { type: "LineString" },
                },
                {
                    geometry: { type: "MultiLineString" },
                },
            ],
        }

        const result = createSourceMetadataFromFeatureCollection(fc as GeoJSON.FeatureCollection)
        expect(result).toEqual({ pointsCount: 0, linesCount: 2, polygonsCount: 0 })
    })

    it("should count polygons correctly", () => {
        const fc = {
            type: "FeatureCollection",
            features: [
                {
                    geometry: { type: "Polygon" },
                },
                {
                    geometry: { type: "MultiPolygon" },
                },
            ],
        }

        const result = createSourceMetadataFromFeatureCollection(fc as GeoJSON.FeatureCollection)
        expect(result).toEqual({ pointsCount: 0, linesCount: 0, polygonsCount: 2 })
    })

    it("should count mixed geometries correctly", () => {
        const fc = {
            type: "FeatureCollection",
            features: [
                {
                    geometry: { type: "Point" },
                },
                {
                    geometry: { type: "LineString" },
                },
                {
                    geometry: { type: "Polygon" },
                },
                {
                    geometry: { type: "MultiPoint" },
                },
                {
                    geometry: { type: "MultiLineString" },
                },
                {
                    geometry: { type: "MultiPolygon" },
                },
            ],
        }

        const result = createSourceMetadataFromFeatureCollection(fc as GeoJSON.FeatureCollection)
        expect(result).toEqual({ pointsCount: 2, linesCount: 2, polygonsCount: 2 })
    })

    it("should handle empty feature collection", () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [],
        }

        const result = createSourceMetadataFromFeatureCollection(fc)
        expect(result).toEqual({ pointsCount: 0, linesCount: 0, polygonsCount: 0 })
    })

    it("should ignore unknown geometry types", () => {
        const fc = {
            type: "FeatureCollection",
            features: [
                {
                    geometry: { type: "UnknownType" },
                },
            ],
        }

        const result = createSourceMetadataFromFeatureCollection(fc as GeoJSON.FeatureCollection)
        expect(result).toEqual({ pointsCount: 0, linesCount: 0, polygonsCount: 0 })
    })
})

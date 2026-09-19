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
        expect(result).toEqual({
            columns: {},
            pointsCount: 2,
            multiPointsCount: 1,
            linesCount: 0,
            multiLinesCount: 0,
            polygonsCount: 0,
            multiPolygonsCount: 0,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 2,
        })
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
        expect(result).toEqual({
            columns: {},
            pointsCount: 0,
            multiPointsCount: 0,
            linesCount: 2,
            multiLinesCount: 1,
            polygonsCount: 0,
            multiPolygonsCount: 0,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 2,
        })
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
        expect(result).toEqual({
            columns: {},
            pointsCount: 0,
            multiPointsCount: 0,
            linesCount: 0,
            multiLinesCount: 0,
            polygonsCount: 2,
            multiPolygonsCount: 1,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 2,
        })
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
        expect(result).toEqual({
            columns: {},
            pointsCount: 2,
            multiPointsCount: 1,
            linesCount: 2,
            multiLinesCount: 1,
            polygonsCount: 2,
            multiPolygonsCount: 1,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 6,
        })
    })

    it("should handle empty feature collection", () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [],
        }

        const result = createSourceMetadataFromFeatureCollection(fc)
        expect(result).toEqual({
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
        })
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
        expect(result).toEqual({
            columns: {},
            pointsCount: 0,
            multiPointsCount: 0,
            linesCount: 0,
            multiLinesCount: 0,
            polygonsCount: 0,
            multiPolygonsCount: 0,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 1,
        })
    })

    test("counts Multi- variants as a subset of their bucket", () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } },
                {
                    type: "Feature",
                    properties: {},
                    geometry: { type: "MultiPoint", coordinates: [[0, 0]] },
                },
            ],
        }
        const meta = createSourceMetadataFromFeatureCollection(fc)

        expect(meta.pointsCount).toBe(2)
        expect(meta.multiPointsCount).toBe(1)
        expect(meta.featuresCount).toBe(2)
    })

    test("does not throw on a feature with null geometry", () => {
        const fc = {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: null }],
        } as unknown as GeoJSON.FeatureCollection
        const meta = createSourceMetadataFromFeatureCollection(fc)

        expect(meta.nullGeometryCount).toBe(1)
        expect(meta.featuresCount).toBe(1)
    })

    test("passes columns through", () => {
        const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] }
        const meta = createSourceMetadataFromFeatureCollection(fc, { name: "String" })

        expect(meta.columns).toEqual({ name: "String" })
    })
})

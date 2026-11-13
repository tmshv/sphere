import { describe, expect, it, vi } from "vitest"
import Feature from "../src/feature_types/feature"
import LineString from "../src/feature_types/line_string"
import MultiFeature from "../src/feature_types/multi_feature"
import Point from "../src/feature_types/point"
import Polygon from "../src/feature_types/polygon"
import createMockCtx from "./utils/create_mock_feature_context"
import getPublicMemberKeys from "./utils/get_public_member_keys"

describe("multi_feature", () => {
    it("MultiPoint via MultiFeature", () => {
        expect(MultiFeature.prototype instanceof Feature, "inherits from Feature").toBeTruthy()

        // Prototype members
        expect(typeof MultiFeature.prototype.isValid, "polygon.isValid").toBe("function")
        expect(typeof MultiFeature.prototype.setCoordinates, "polygon.setCoordinates").toBe("function")
        expect(typeof MultiFeature.prototype.getCoordinate, "polygon.getCoordinate").toBe("function")
        expect(typeof MultiFeature.prototype.getCoordinates, "polygon.getCoordinates").toBe("function")
        expect(typeof MultiFeature.prototype.updateCoordinate, "polygon.updateCoordinate").toBe("function")
        expect(typeof MultiFeature.prototype.addCoordinate, "polygon.addCoordinate").toBe("function")
        expect(typeof MultiFeature.prototype.removeCoordinate, "polygon.removeCoordinate").toBe("function")
        expect(typeof MultiFeature.prototype.getFeatures, "polygon.getFeatures").toBe("function")

        expect(getPublicMemberKeys(MultiFeature.prototype).length, "no unexpected prototype members").toBe(8)
    })

    it("MultiPoint", () => {
        const rawMultiPoint = {
            type: "Feature",
            id: "wahoo",
            properties: { foo: "bar" },
            geometry: {
                type: "MultiPoint",
                coordinates: [
                    [1, 1],
                    [2, 2],
                    [3, 3],
                ],
            },
        }
        const ctx = createMockCtx()
        let multiPoint
        expect(() => {
            multiPoint = new MultiFeature(ctx, rawMultiPoint)
        }, "MultiPoint type does not throw").not.toThrow()
        const changedSpy = vi.spyOn(multiPoint, "changed")

        // Instance members
        expect(multiPoint.ctx, "multiPoint.ctx").toBe(ctx)
        expect(multiPoint.coordinates, "no coordinates").toBe(undefined)
        expect(multiPoint.properties, "multiPoint.properties").toEqual({ foo: "bar" })
        expect(multiPoint.id, "multiPoint.id").toBe("wahoo")
        expect(multiPoint.type, "multiPoint.type").toBe("MultiPoint")
        expect(multiPoint.features.length, "multiPoint.features").toBe(3)
        // multiPoint.changed gets counted because it's used below
        expect(getPublicMemberKeys(multiPoint).length, "no unexpected instance members").toBe(7)

        const pointA = multiPoint.features[0]
        const pointB = multiPoint.features[1]
        const pointC = multiPoint.features[2]

        expect(pointA).toEqual(
            new Point(ctx, {
                id: pointA.id,
                type: "Feature",
                properties: {},
                geometry: {
                    coordinates: [1, 1],
                    type: "Point",
                },
            }),
        )
        expect(pointB).toEqual(
            new Point(ctx, {
                id: pointB.id,
                type: "Feature",
                properties: {},
                geometry: {
                    coordinates: [2, 2],
                    type: "Point",
                },
            }),
        )
        expect(pointC).toEqual(
            new Point(ctx, {
                id: pointC.id,
                type: "Feature",
                properties: {},
                geometry: {
                    coordinates: [3, 3],
                    type: "Point",
                },
            }),
        )

        const pointAGetCoordinateSpy = vi.spyOn(pointA, "getCoordinate")
        const pointBGetCoordinateSpy = vi.spyOn(pointB, "getCoordinate")
        const pointCGetCoordinateSpy = vi.spyOn(pointC, "getCoordinate")
        const coordinate = multiPoint.getCoordinate("2")
        expect(pointAGetCoordinateSpy, "point A getCoordinate not called").toHaveBeenCalledTimes(0)
        expect(pointBGetCoordinateSpy, "point B getCoordinate not called").toHaveBeenCalledTimes(0)
        expect(pointCGetCoordinateSpy, "point C getCoordinate").toHaveBeenCalledTimes(1)
        expect(coordinate, "correct coordinate").toEqual([3, 3])

        const pointAUpdateCoordinateSpy = vi.spyOn(pointA, "updateCoordinate")
        const pointBUpdateCoordinateSpy = vi.spyOn(pointB, "updateCoordinate")
        const pointCUpdateCoordinateSpy = vi.spyOn(pointC, "updateCoordinate")
        multiPoint.updateCoordinate("0", 99, 100)
        expect(pointAUpdateCoordinateSpy, "point A updateCoordinate").toHaveBeenCalledTimes(1)
        expect(pointBUpdateCoordinateSpy, "point B updateCoordinate not called").toHaveBeenCalledTimes(0)
        expect(pointCUpdateCoordinateSpy, "point C updateCoordinate not called").toHaveBeenCalledTimes(0)
        expect(multiPoint.getCoordinate("0"), "correct coordinate").toEqual([99, 100])

        expect(multiPoint.getCoordinates(), "getCoordinates returns the complete multi-coordinates").toEqual([
            [99, 100],
            [2, 2],
            [3, 3],
        ])

        multiPoint.setCoordinates([
            [6, 6],
            [7, 7],
        ])
        expect(changedSpy, "changed called by setCoordinates").toHaveBeenCalledTimes(2)
        expect(multiPoint.getCoordinates()).toEqual([
            [6, 6],
            [7, 7],
        ])

        expect(multiPoint.isValid(), "positive validation works").toBe(true)
        multiPoint.setCoordinates([[1], []])
        expect(multiPoint.isValid(), "negative validation works").toBe(false)
    })

    // Tests below less in depth becuase we know the
    // inner-workings are the same
    it("MultiPolygon via MultiFeature", () => {
        const rawMultiPolygon = {
            type: "Feature",
            id: "zing",
            properties: { f: "a" },
            geometry: {
                type: "MultiPolygon",
                coordinates: [
                    [
                        [
                            [1, 1],
                            [2, 2],
                            [3, 3],
                            [4, 4],
                            [1, 1],
                        ],
                    ],
                    [
                        [
                            [2, 1],
                            [6, 2],
                            [8, 3],
                            [2, 4],
                            [2, 1],
                        ],
                        [
                            [1, 1],
                            [2, 2],
                            [3, 3],
                            [1, 1],
                        ],
                    ],
                ],
            },
        }
        const ctx = createMockCtx()
        let multiPolygon
        expect(() => {
            multiPolygon = new MultiFeature(ctx, rawMultiPolygon)
        }, "MultiPolygon type does not throw").not.toThrow()

        const polygonA = multiPolygon.features[0]
        const polygonB = multiPolygon.features[1]

        expect(polygonA).toEqual(
            new Polygon(ctx, {
                id: polygonA.id,
                type: "Feature",
                properties: {},
                geometry: {
                    coordinates: [
                        [
                            [1, 1],
                            [2, 2],
                            [3, 3],
                            [4, 4],
                            [1, 1],
                        ],
                    ],
                    type: "Polygon",
                },
            }),
        )
        expect(polygonB).toEqual(
            new Polygon(ctx, {
                id: polygonB.id,
                type: "Feature",
                properties: {},
                geometry: {
                    coordinates: [
                        [
                            [2, 1],
                            [6, 2],
                            [8, 3],
                            [2, 4],
                            [2, 1],
                        ],
                        [
                            [1, 1],
                            [2, 2],
                            [3, 3],
                            [1, 1],
                        ],
                    ],
                    type: "Polygon",
                },
            }),
        )
    })

    it("MultiLineString via MultiFeature", () => {
        const rawMultiLineString = {
            type: "Feature",
            id: "lineline",
            properties: { g: "h" },
            geometry: {
                type: "MultiLineString",
                coordinates: [
                    [
                        [1, 1],
                        [2, 2],
                        [3, 3],
                    ],
                    [
                        [4, 4],
                        [5, 5],
                        [6, 6],
                    ],
                ],
            },
        }
        const ctx = createMockCtx()
        let multiLineString
        expect(() => {
            multiLineString = new MultiFeature(ctx, rawMultiLineString)
        }, "MultiLineString type does not throw").not.toThrow()

        const lineStringA = multiLineString.features[0]
        const lineStringB = multiLineString.features[1]

        expect(lineStringA).toEqual(
            new LineString(ctx, {
                id: lineStringA.id,
                type: "Feature",
                properties: {},
                geometry: {
                    coordinates: [
                        [1, 1],
                        [2, 2],
                        [3, 3],
                    ],
                    type: "LineString",
                },
            }),
        )
        expect(lineStringB).toEqual(
            new LineString(ctx, {
                id: lineStringB.id,
                type: "Feature",
                properties: {},
                geometry: {
                    coordinates: [
                        [4, 4],
                        [5, 5],
                        [6, 6],
                    ],
                    type: "LineString",
                },
            }),
        )
    })

    it("Invalid MultiFeature type", () => {
        const rawThing = {
            type: "Feature",
            id: "blergh",
            properties: { g: "h" },
            geometry: {
                type: "thing",
                coordinates: [
                    [
                        [1, 1],
                        [2, 2],
                        [3, 3],
                    ],
                    [
                        [4, 4],
                        [5, 5],
                        [6, 6],
                    ],
                ],
            },
        }
        let thing
        expect(() => {
            thing = new MultiFeature(createMockCtx(), rawThing)
        }, "invalid type throws").toThrow()
        expect(thing).toBeFalsy()
    })
})

import { describe, expect, it, vi } from "vitest"
import MapboxDraw from "../index"
import Feature from "../src/feature_types/feature"
import Polygon from "../src/feature_types/polygon"
import createFeature from "./utils/create_feature"
import createMap from "./utils/create_map"
import createMockCtx from "./utils/create_mock_feature_context"
import drawGeometry from "./utils/draw_geometry"
import getPublicMemberKeys from "./utils/get_public_member_keys"
import waitForLoad from "./utils/wait_for_load"

describe("polygon", () => {
    it("Polygon constructor and API", () => {
        const rawPolygon = createFeature("polygon")
        rawPolygon.geometry.coordinates = [
            [
                [1, 2],
                [3, 4],
                [5, 6],
                [7, 8],
                [1, 2],
            ],
        ]
        const ctx = createMockCtx()
        const polygon = new Polygon(ctx, rawPolygon)

        // Instance members
        expect(polygon.ctx, "polygon.ctx").toBe(ctx)
        expect(
            polygon.coordinates,
            "polygon.coordinates remove the last coordinate of the ring (which matches the first)",
        ).toEqual([
            [
                [1, 2],
                [3, 4],
                [5, 6],
                [7, 8],
            ],
        ])
        expect(polygon.properties, "polygon.properties").toBe(rawPolygon.properties)
        expect(polygon.id, "polygon.id").toBe(rawPolygon.id)
        expect(polygon.type, "polygon.type").toBe(rawPolygon.geometry.type)
        expect(getPublicMemberKeys(polygon).length, "no unexpected instance members").toBe(5)

        // Prototype members
        expect(typeof Polygon.prototype.isValid, "polygon.isValid").toBe("function")
        expect(typeof Polygon.prototype.incomingCoords, "polygon.incomingCoords").toBe("function")
        expect(typeof Polygon.prototype.setCoordinates, "polygon.setCoordinates").toBe("function")
        expect(typeof Polygon.prototype.addCoordinate, "polygon.addCoordinate").toBe("function")
        expect(typeof Polygon.prototype.getCoordinate, "polygon.getCoordinate").toBe("function")
        expect(typeof Polygon.prototype.getCoordinates, "polygon.getCoordinates").toBe("function")
        expect(typeof Polygon.prototype.removeCoordinate, "polygon.removeCoordinate").toBe("function")
        expect(typeof Polygon.prototype.updateCoordinate, "polygon.updateCoordinate").toBe("function")
        expect(getPublicMemberKeys(Polygon.prototype).length, "no unexpected prototype members").toBe(8)

        expect(Polygon.prototype instanceof Feature, "inherits from Feature").toBeTruthy()
    })

    it("Polygon#isValid", () => {
        const validRawPolygon = createFeature("polygon")
        const validPolygon = new Polygon(createMockCtx(), validRawPolygon)
        expect(validPolygon.isValid(), "returns true for valid polygons").toBe(true)

        const invalidRawPolygonA = createFeature("polygon")
        invalidRawPolygonA.geometry.coordinates = [
            [
                [1, 2],
                [3, 4],
                [5, 6],
            ],
            [
                [7, 8],
                [9, 10],
            ],
        ]
        const invalidPolygonA = new Polygon(createMockCtx(), invalidRawPolygonA)
        expect(invalidPolygonA.isValid(), "returns false when a ring has fewer than 3 coordinates").toBe(false)
    })

    it("Polygon#incomingCoords, Polygon#getCoordinates", () => {
        const rawPolygon = createFeature("polygon")
        const polygon = new Polygon(createMockCtx(), rawPolygon)
        const changedSpy = vi.spyOn(polygon, "changed")

        polygon.incomingCoords([
            [
                [1, 2],
                [3, 4],
                [5, 6],
                [1, 2],
            ],
        ])
        expect(changedSpy, "calls polygon.changed").toHaveBeenCalledTimes(1)
        expect(polygon.coordinates, "sets new coordinates, eliminating last (closing) one").toEqual([
            [
                [1, 2],
                [3, 4],
                [5, 6],
            ],
        ])
        expect(polygon.getCoordinates(), "getCoordinates return closed rings").toEqual([
            [
                [1, 2],
                [3, 4],
                [5, 6],
                [1, 2],
            ],
        ])
    })

    it("Polygon#setCoordinates", () => {
        const rawPolygon = createFeature("polygon")
        const polygon = new Polygon(createMockCtx(), rawPolygon)
        const changedSpy = vi.spyOn(polygon, "changed")

        polygon.setCoordinates([
            [
                [1, 2],
                [3, 4],
                [5, 6],
            ],
        ])
        expect(changedSpy, "polygon.changed called").toHaveBeenCalledTimes(1)
        expect(polygon.coordinates, "new coordinates set").toEqual([
            [
                [1, 2],
                [3, 4],
                [5, 6],
            ],
        ])
    })

    it("Polygon#addCoordinate, Polygon#removeCoordinate", () => {
        const rawPolygon = createFeature("polygon")
        rawPolygon.geometry.coordinates = [
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [4, 4],
                [1, 1],
            ],
            [
                [2, 1],
                [3, 2],
                [4, 3],
                [5, 4],
                [2, 1],
            ],
        ]
        const polygon = new Polygon(createMockCtx(), rawPolygon)
        const changedSpy = vi.spyOn(polygon, "changed")

        changedSpy.mockClear()
        polygon.addCoordinate("1.1", 99, 100)
        expect(changedSpy, "polygon.changed was called").toHaveBeenCalledTimes(1)
        expect(polygon.getCoordinates(), "new coordinate added at right place in right ring").toEqual([
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [4, 4],
                [1, 1],
            ],
            [
                [2, 1],
                [99, 100],
                [3, 2],
                [4, 3],
                [5, 4],
                [2, 1],
            ],
        ])

        changedSpy.mockClear()
        polygon.removeCoordinate("0.3")
        expect(changedSpy, "polygon.changed was called").toHaveBeenCalledTimes(1)
        expect(polygon.getCoordinates(), "coordinate removed at right place in right ring").toEqual([
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [1, 1],
            ],
            [
                [2, 1],
                [99, 100],
                [3, 2],
                [4, 3],
                [5, 4],
                [2, 1],
            ],
        ])
    })

    it("Polygon#updateCoordinate, Polygon#getCoordinate", () => {
        const rawPolygon = createFeature("polygon")
        rawPolygon.geometry.coordinates = [
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [4, 4],
                [1, 1],
            ],
            [
                [2, 1],
                [3, 2],
                [4, 3],
                [5, 4],
                [2, 1],
            ],
        ]
        const polygon = new Polygon(createMockCtx(), rawPolygon)
        const changedSpy = vi.spyOn(polygon, "changed")

        changedSpy.mockClear()
        expect(polygon.getCoordinate("1.2"), "getCoordinate returns right one").toEqual([4, 3])
        polygon.updateCoordinate("1.2", 99, 100)
        expect(changedSpy, "polygon.changed was called").toHaveBeenCalledTimes(1)
        expect(polygon.getCoordinates(), "correct coordinate was changed").toEqual([
            [
                [1, 1],
                [2, 2],
                [3, 3],
                [4, 4],
                [1, 1],
            ],
            [
                [2, 1],
                [3, 2],
                [99, 100],
                [5, 4],
                [2, 1],
            ],
        ])
        expect(polygon.getCoordinate("1.2"), "getCoordinate still works").toEqual([99, 100])
    })

    it("Polygon integration", async () => {
        const polygonCoordinates = [
            [
                [0, 0],
                [30, 15],
                [32, 35],
                [15, 30],
                [0, 0],
            ],
        ]
        const map = createMap()
        const Draw = new MapboxDraw()
        map.addControl(Draw)

        await waitForLoad(map)
        await drawGeometry(map, Draw, "Polygon", polygonCoordinates)

        const feats = Draw.getAll().features
        expect(1, "only one").toBe(feats.length)
        expect("Polygon", "of the right type").toBe(feats[0].geometry.type)
        expect(feats[0].geometry.coordinates[0].length, "right number of points").toBe(polygonCoordinates[0].length)
        expect(feats[0].geometry.coordinates, "in the right spot").toEqual(polygonCoordinates)
        Draw.onRemove()
    })
})

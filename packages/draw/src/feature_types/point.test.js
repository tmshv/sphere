import { describe, expect, it, vi } from "vitest"
import MapboxDraw from "../index"
import Feature from "./feature"
import Point from "./point"
import createFeature from "../test-utils/create_feature"
import createMap from "../test-utils/create_map"
import createMockCtx from "../test-utils/create_mock_feature_context"
import drawGeometry from "../test-utils/draw_geometry"
import getPublicMemberKeys from "../test-utils/get_public_member_keys"
import waitForLoad from "../test-utils/wait_for_load"

describe("point", () => {
    it("Point constructor and API", () => {
        const rawPoint = createFeature("point")
        const ctx = createMockCtx()
        const point = new Point(ctx, rawPoint)

        // Instance members
        expect(point.ctx, "point.ctx").toBe(ctx)
        expect(point.coordinates, "point.coordinates").toBe(rawPoint.geometry.coordinates)
        expect(point.properties, "point.properties").toBe(rawPoint.properties)
        expect(point.id, "point.id").toBe(rawPoint.id)
        expect(point.type, "point.type").toBe(rawPoint.geometry.type)
        expect(getPublicMemberKeys(point).length, "no unexpected instance members").toBe(5)

        // Prototype members
        expect(typeof Point.prototype.isValid, "point.isValid").toBe("function")
        expect(typeof Point.prototype.getCoordinate, "point.getCoordinate").toBe("function")
        expect(typeof Point.prototype.updateCoordinate, "point.updateCoordinate").toBe("function")
        expect(getPublicMemberKeys(Point.prototype).length, "no unexpected prototype members").toBe(3)

        expect(Point.prototype instanceof Feature, "inherits from Feature").toBeTruthy()
    })

    it("Point#isValid", () => {
        const validRawPoint = createFeature("point")
        const validPoint = new Point(createMockCtx(), validRawPoint)
        expect(validPoint.isValid(), "returns true for valid point").toBe(true)

        const invalidRawPointA = createFeature("point")
        invalidRawPointA.geometry.coordinates = [0, "1"]
        const invalidPointA = new Point(createMockCtx(), invalidRawPointA)
        expect(invalidPointA.isValid(), "returns false with non-number coordinate").toBe(false)

        const invalidRawPointB = createFeature("point")
        invalidRawPointB.geometry.coordinates = ["1", 0]
        // Upstream passes invalidRawPointA here (kept for a faithful port)
        const invalidPointB = new Point(createMockCtx(), invalidRawPointA)
        expect(invalidPointB.isValid(), "returns false with non-number coordinate, again").toBe(false)
    })

    it("Point#updateCoordinate, Point#getCoordinate", () => {
        const rawPoint = createFeature("point")
        rawPoint.geometry.coordinates = [1, 2]
        const point = new Point(createMockCtx(), rawPoint)
        const changedSpy = vi.spyOn(point, "changed")

        expect(point.getCoordinate()).toEqual([1, 2])

        point.updateCoordinate(3, 4, 5)
        expect(changedSpy).toHaveBeenCalledTimes(1)
        expect(point.getCoordinate(), "handles 3 arguments, ignoring the first (as path)").toEqual([4, 5])

        point.updateCoordinate(6, 7)
        expect(point.getCoordinate(), "handles 2 arguments").toEqual([6, 7])
    })

    it("Point integration test", async () => {
        const pointCoordinates = [10, 10]
        const map = createMap()
        const Draw = new MapboxDraw()
        map.addControl(Draw)

        await waitForLoad(map)
        await drawGeometry(map, Draw, "Point", pointCoordinates)

        const feats = Draw.getAll().features
        expect(1, "only one").toBe(feats.length)
        expect("Point", "of the right type").toBe(feats[0].geometry.type)
        expect([10, 10], "in the right spot").toEqual(feats[0].geometry.coordinates)

        Draw.onRemove()
    })
})

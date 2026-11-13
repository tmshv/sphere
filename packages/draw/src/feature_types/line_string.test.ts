import { describe, expect, it, vi } from "vitest"
import MapboxDraw from "../index"
import Feature from "./feature"
import LineString from "./line_string"
import createFeature from "../test-utils/create_feature"
import createMap from "../test-utils/create_map"
import createMockCtx from "../test-utils/create_mock_feature_context"
import drawGeometry from "../test-utils/draw_geometry"
import getPublicMemberKeys from "../test-utils/get_public_member_keys"
import waitForLoad from "../test-utils/wait_for_load"

describe("line_string", () => {
    it("LineString constructor and API", () => {
        const rawLine = createFeature("line")
        const ctx = createMockCtx()
        const lineString = new LineString(ctx, rawLine)

        // Instance members
        expect(lineString.ctx, "lineString.ctx").toBe(ctx)
        expect(lineString.coordinates, "lineString.coordinates").toBe(rawLine.geometry.coordinates)
        expect(lineString.properties, "lineString.properties").toBe(rawLine.properties)
        expect(lineString.id, "lineString.id").toBe(rawLine.id)
        expect(lineString.type, "lineString.type").toBe(rawLine.geometry.type)
        expect(getPublicMemberKeys(lineString).length, "no unexpected instance members").toBe(5)

        // Prototype members
        expect(typeof LineString.prototype.isValid, "lineString.isValid").toBe("function")
        expect(typeof LineString.prototype.addCoordinate, "lineString.addCoordinate").toBe("function")
        expect(typeof LineString.prototype.getCoordinate, "lineString.getCoordinate").toBe("function")
        expect(typeof LineString.prototype.removeCoordinate, "lineString.removeCoordinate").toBe("function")
        expect(typeof LineString.prototype.updateCoordinate, "lineString.updateCoordinate").toBe("function")
        expect(getPublicMemberKeys(LineString.prototype).length, "no unexpected prototype members").toBe(5)

        expect(LineString.prototype instanceof Feature, "inherits from Feature").toBeTruthy()
    })

    it("LineString#isValid", () => {
        const validRawLine = createFeature("line")
        const validLineString = new LineString(createMockCtx(), validRawLine)
        expect(validLineString.isValid(), "returns true when valid").toBe(true)

        const invalidRawLineA = createFeature("line")
        // A lone number is not a position on purpose, which a typed assignment would not allow
        Reflect.set(invalidRawLineA.geometry, "coordinates", [3])
        const invalidLineStringA = new LineString(createMockCtx(), invalidRawLineA)
        expect(invalidLineStringA.isValid(), "returns false when there is one coordinate").toBe(false)

        const invalidRawLineB = createFeature("line")
        invalidRawLineB.geometry.coordinates = []
        const invalidLineStringB = new LineString(createMockCtx(), invalidRawLineB)
        expect(invalidLineStringB.isValid(), "returns false when there are no coordinates").toBe(false)
    })

    it("LineString#addCoordinate", () => {
        const rawLine = createFeature("line")
        rawLine.geometry.coordinates = [
            [1, 2],
            [3, 4],
        ]
        const lineString = new LineString(createMockCtx(), rawLine)
        const changedSpy = vi.spyOn(lineString, "changed")

        lineString.addCoordinate(1, 5, 6)
        expect(changedSpy, "called lineString.changed()").toHaveBeenCalledTimes(1)
        expect(lineString.getCoordinates(), "new coordinate inserted in correct place").toEqual([
            [1, 2],
            [5, 6],
            [3, 4],
        ])

        lineString.addCoordinate("0", 7, 8)
        expect(lineString.getCoordinates(), "string path works").toEqual([
            [7, 8],
            [1, 2],
            [5, 6],
            [3, 4],
        ])
    })

    it("LineString#getCoordinate", () => {
        const rawLine = createFeature("line")
        rawLine.geometry.coordinates = [
            [1, 2],
            [3, 4],
        ]
        const lineString = new LineString(createMockCtx(), rawLine)

        expect(lineString.getCoordinate(0), "number path works").toEqual([1, 2])
        expect(lineString.getCoordinate("1"), "string path works").toEqual([3, 4])
    })

    it("LineString#removeCoordinate", () => {
        const rawLine = createFeature("line")
        rawLine.geometry.coordinates = [
            [1, 2],
            [3, 4],
        ]
        const lineString = new LineString(createMockCtx(), rawLine)
        const changedSpy = vi.spyOn(lineString, "changed")

        lineString.removeCoordinate(1)
        expect(changedSpy, "called lineString.changed()").toHaveBeenCalledTimes(1)
        expect(lineString.getCoordinates(), "coordinate removed from correct place").toEqual([[1, 2]])
    })

    it("LineString#updateCoordinate", () => {
        const rawLine = createFeature("line")
        rawLine.geometry.coordinates = [
            [1, 2],
            [3, 4],
            [5, 6],
        ]
        const lineString = new LineString(createMockCtx(), rawLine)
        const changedSpy = vi.spyOn(lineString, "changed")

        lineString.updateCoordinate(1, 7, 8)
        expect(changedSpy, "called lineString.changed()").toHaveBeenCalledTimes(1)
        expect(lineString.getCoordinates(), "coordinate updated at correct place").toEqual([
            [1, 2],
            [7, 8],
            [5, 6],
        ])
    })

    it("LineString integration", async () => {
        const lineStringCoordinates = [
            [0, 0],
            [40, 20],
            [20, 40],
        ]
        const map = createMap()
        const Draw = new MapboxDraw()
        map.addControl(Draw)

        await waitForLoad(map)
        await drawGeometry(map, Draw, "LineString", lineStringCoordinates)

        const feats = Draw.getAll().features
        expect(1, "only one").toBe(feats.length)
        expect("LineString", "of the right type").toBe(feats[0].geometry.type)
        const geometry = feats[0].geometry
        if (geometry.type !== "LineString") throw new Error(`Expected a LineString, got ${geometry.type}`)
        expect(lineStringCoordinates[0].length, "right number of points").toBe(geometry.coordinates[0].length)
        expect([...lineStringCoordinates, [20, 40]], "in the right spot").toEqual(geometry.coordinates)
        Draw.onRemove()
    })
})

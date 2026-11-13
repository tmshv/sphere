import { describe, expect, it } from "vitest"
import geometryArea, { ringArea } from "./geojson_area"

// One degree square at the equator, about 12364 km²
const unitSquare = [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
    [0, 0],
]
const UNIT_SQUARE_AREA = 12391399902

describe("geometryArea", () => {
    it("measures a polygon", () => {
        expect(geometryArea({ type: "Polygon", coordinates: [unitSquare] })).toBeCloseTo(UNIT_SQUARE_AREA, -3)
    })

    it("is signed by ring orientation for a ring", () => {
        expect(ringArea(unitSquare)).toBeGreaterThan(0)
        expect(ringArea([...unitSquare].reverse())).toBeLessThan(0)
    })

    it("subtracts holes", () => {
        const hole = [
            [0.25, 0.25],
            [0.25, 0.75],
            [0.75, 0.75],
            [0.75, 0.25],
            [0.25, 0.25],
        ]
        const withHole = geometryArea({ type: "Polygon", coordinates: [unitSquare, hole] })
        expect(withHole).toBeLessThan(UNIT_SQUARE_AREA)
        expect(withHole).toBeGreaterThan(UNIT_SQUARE_AREA / 2)
    })

    it("sums the polygons of a multipolygon", () => {
        const area = geometryArea({ type: "MultiPolygon", coordinates: [[unitSquare], [unitSquare]] })
        expect(area).toBeCloseTo(2 * UNIT_SQUARE_AREA, -3)
    })

    it("gives zero for points and lines", () => {
        expect(geometryArea({ type: "Point", coordinates: [0, 0] })).toBe(0)
        expect(geometryArea({ type: "LineString", coordinates: unitSquare })).toBe(0)
    })

    it("gives zero for a degenerate ring", () => {
        expect(
            ringArea([
                [0, 0],
                [1, 1],
            ]),
        ).toBe(0)
    })
})

import { describe, expect, it } from "vitest"
import coordinatesEqual from "./coordinates_equal"

describe("coordinatesEqual", () => {
    it("compares positions", () => {
        expect(coordinatesEqual([1, 2], [1, 2])).toBe(true)
        expect(coordinatesEqual([1, 2], [1, 3])).toBe(false)
        expect(coordinatesEqual([1, 2], [1, 2, 3])).toBe(false)
    })

    it("compares nested coordinates", () => {
        const ring = [
            [0, 0],
            [1, 1],
            [0, 1],
            [0, 0],
        ]
        expect(coordinatesEqual([ring], [ring.map(p => [...p])])).toBe(true)
        expect(coordinatesEqual([ring], [ring.slice(1)])).toBe(false)
    })

    it("does not treat an array as equal to a number", () => {
        expect(coordinatesEqual([1], 1)).toBe(false)
        expect(coordinatesEqual(1, [1])).toBe(false)
    })
})

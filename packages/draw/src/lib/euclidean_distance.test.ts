import { describe, expect, it } from "vitest"
import euclideanDistance from "./euclidean_distance"

describe("euclideanDistance", () => {
    it("computes distance between two points", () => {
        expect(euclideanDistance({ x: 1, y: 1 }, { x: 4, y: 4 })).toBe(4.242640687119285)
        expect(euclideanDistance({ x: -10, y: 99.486354 }, { x: 0, y: -0.324736 })).toBe(100.31078549681536)
    })
})

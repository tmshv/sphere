import { describe, expect, test } from "vitest"
import { lerp } from "./math"

describe("lib/math/lerp", () => {
    test("should return proper value", () => {
        expect(lerp(0.5, 0, 1, 10, 20)).toEqual(15)
        expect(lerp(0.25, 0, 1, 100, 200)).toEqual(125)
    })

    test("should return A if v=min", () => {
        const A = Math.random()
        const B = A + Math.random()
        expect(lerp(1, 1, 2, A, B)).toEqual(A)
    })

    test("should return B if v=max", () => {
        const A = Math.random()
        const B = A + Math.random()
        expect(lerp(2, 1, 2, A, B)).toEqual(B)
    })
})

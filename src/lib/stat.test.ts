import { describe, expect, test } from "vitest"
import { hist } from "./stat"

describe("hist", () => {
    test("returns array of length equal to bins", () => {
        expect(hist([1, 2, 3], 5)).toHaveLength(5)
        expect(hist([1, 2, 3], 1)).toHaveLength(1)
        expect(hist([1, 2, 3], 10)).toHaveLength(10)
    })

    test("empty input produces all-zero histogram", () => {
        expect(hist([], 3)).toEqual([0, 0, 0])
        expect(hist([], 5)).toEqual([0, 0, 0, 0, 0])
    })

    test("uniform distribution spreads counts evenly across bins", () => {
        // lerp maps [0,1,2,3] with min=0, max=3 to bins [0,1,2,3]
        expect(hist([0, 1, 2, 3], 4)).toEqual([1, 1, 1, 1])
    })

    test("values at range boundaries go to first and last bins", () => {
        const result = hist([0, 10], 5)
        expect(result).toHaveLength(5)
        expect(result[0]).toBe(1)
        expect(result[4]).toBe(1)
    })

    test("skewed distribution concentrates counts in low bins", () => {
        // three values near min, one at max
        const result = hist([0, 1, 2, 100], 4)
        expect(result).toHaveLength(4)
        // the single high value lands in the last bin
        expect(result[3]).toBe(1)
    })

    test("two-value input places each value in a bin", () => {
        // [0, 4] with 5 bins: lerp(0,0,4,0,4)=0, lerp(4,0,4,0,4)=4
        const result = hist([0, 4], 5)
        expect(result[0]).toBe(1)
        expect(result[4]).toBe(1)
    })
})

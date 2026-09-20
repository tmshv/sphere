import { describe, expect, it } from "vitest"
import { restoreSize } from "./sizes"

describe("restoreSize", () => {
    it("takes the difference from the other sections", () => {
        expect(restoreSize([100, 300], 0, 200, [30, 30])).toEqual([200, 200])
    })

    it("takes proportionally from several sections", () => {
        const result = restoreSize([100, 200, 100], 0, 200, [30, 30, 30])

        expect(result.at(0)).toBe(200)
        expect(result.at(1)).toBeCloseTo(133.33, 1)
        expect(result.at(2)).toBeCloseTo(66.67, 1)
    })

    it("gives back only what the minimums allow", () => {
        // The donor cannot fall below 150, so only 150 is available.
        expect(restoreSize([100, 300], 0, 400, [30, 150])).toEqual([250, 150])
    })

    it("preserves the total", () => {
        const before = [100, 200, 100]
        const after = restoreSize(before, 2, 350, [30, 30, 30])
        const sum = (sizes: number[]) => sizes.reduce((total, size) => total + size, 0)

        expect(sum(after)).toBeCloseTo(sum(before), 6)
    })

    it("leaves a lone section alone", () => {
        expect(restoreSize([400], 0, 200, [30])).toEqual([400])
    })

    it("ignores an index past the end", () => {
        expect(restoreSize([100, 300], 5, 200, [30, 30])).toEqual([100, 300])
    })

    it("ignores a negative index", () => {
        expect(restoreSize([100, 300], -1, 200, [30, 30])).toEqual([100, 300])
    })

    it("treats a missing minimum as zero", () => {
        expect(restoreSize([100, 300], 0, 200, [])).toEqual([200, 200])
    })
})

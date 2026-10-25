import { describe, expect, test } from "vitest"
import { fractionsBetween } from "./fraction-index"

describe("fractionsBetween", () => {
    test("spreads values evenly between two neighbours", () => {
        expect(fractionsBetween(0, 1, 1)).toEqual([0.5])
        expect(fractionsBetween(0, 3, 2)).toEqual([1, 2])
    })

    test("steps one below the first or one above the last neighbour", () => {
        expect(fractionsBetween(undefined, 2, 2)).toEqual([0, 1])
        expect(fractionsBetween(5, undefined, 2)).toEqual([6, 7])
    })

    test("starts from zero with no neighbours", () => {
        expect(fractionsBetween(undefined, undefined, 2)).toEqual([0, 1])
    })
})

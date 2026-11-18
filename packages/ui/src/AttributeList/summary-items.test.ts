import { describe, expect, it } from "vitest"
import { numericItems } from "./NumericSummary"
import { topValueItems } from "./StringSummary"

const HISTOGRAM = [1, 2, 3]

describe("numericItems", () => {
    it("lists min, max and mean in that order", () => {
        expect(numericItems({ kind: "numeric", min: 1, max: 9, mean: 4.5, histogram: HISTOGRAM })).toEqual([
            { name: "min", value: 1 },
            { name: "max", value: 9 },
            { name: "mean", value: 4.5 },
        ])
    })

    it("skips a statistic the summary does not have, and keeps a zero", () => {
        expect(numericItems({ kind: "numeric", min: 0, histogram: HISTOGRAM })).toEqual([{ name: "min", value: 0 }])
    })
})

describe("topValueItems", () => {
    it("pairs each frequent value with its count, most frequent first", () => {
        const items = topValueItems({
            kind: "string",
            unique: 5,
            topValues: [
                ["Moscow", 12],
                ["Berlin", 3],
            ],
        })

        expect(items).toEqual([
            { name: "Moscow", value: 12 },
            { name: "Berlin", value: 3 },
        ])
    })
})

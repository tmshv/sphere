import { expect, test, describe } from "vitest"
import { head, init, last, tail, zip } from "./array"

describe("lib/array/head", () => {
    test("returns the first element of an array", () => {
        const array = [1, 2, 3, 4, 5]
        expect(head(array)).toBe(1)
    })

    test("returns null for zero length array", () => {
        expect(head([])).toBeNull()
    })
})

describe("lib/array/last", () => {
    test("returns the last element of an array", () => {
        const array = [1, 2, 3, 4, 5]
        expect(last(array)).toBe(5)
    })

    test("returns null for zero length array", () => {
        expect(last([])).toBeNull()
    })
})

describe("lib/array/init", () => {
    test("returns an array without the last element", () => {
        const array = [1, 2, 3, 4, 5]
        expect(init(array)).toEqual([1, 2, 3, 4])
    })

    test("returns empty array for zero length array", () => {
        expect(init([])).toEqual([])
    })
})

describe("lib/array/tail", () => {
    test("returns an array without the first element", () => {
        const array = [1, 2, 3, 4, 5]
        expect(tail(array)).toEqual([2, 3, 4, 5])
    })

    test("returns empty array for zero length array", () => {
        expect(tail([])).toEqual([])
    })
})

describe("lib/array/zip", () => {
    test("zips two arrays into an array of tuples", () => {
        const a = ["a", "b", "c"]
        const b = [1, 2, 3]
        expect(zip(a, b)).toEqual([["a", 1], ["b", 2], ["c", 3]])
    })
})

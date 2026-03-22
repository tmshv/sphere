import { deduplicate, head, init, last, tail, zip } from "./array"

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
        expect(zip(a, b)).toEqual([
            ["a", 1],
            ["b", 2],
            ["c", 3],
        ])
    })
})

describe("lib/array/deduplicate", () => {
    test("returns empty array for empty input", () => {
        expect(deduplicate([], x => x)).toEqual([])
    })

    test("returns single item unchanged", () => {
        expect(deduplicate(["a"], x => x)).toEqual(["a"])
    })

    test("keeps items with distinct keys", () => {
        expect(deduplicate([1, 2, 3], x => String(x))).toEqual([1, 2, 3])
    })

    test("removes duplicates by key", () => {
        expect(deduplicate([1, 2, 1, 3], x => String(x))).toEqual([1, 2, 3])
    })

    test("preserves the first occurrence", () => {
        const items = [{ id: 1, v: "first" }, { id: 1, v: "second" }]
        const result = deduplicate(items, x => String(x.id))
        expect(result).toHaveLength(1)
        expect(result[0].v).toBe("first")
    })

    test("uses key function output, not reference equality", () => {
        const a = { group: "x" }
        const b = { group: "x" }
        expect(deduplicate([a, b], x => x.group)).toHaveLength(1)
    })

    test("deduplicates by numeric key", () => {
        const items = [{ id: 1, v: "a" }, { id: 2, v: "b" }, { id: 1, v: "c" }]
        const result = deduplicate(items, x => x.id)
        expect(result).toHaveLength(2)
        expect(result[0].v).toBe("a")
        expect(result[1].v).toBe("b")
    })
})

import { describe, expect, it } from "vitest"
import { branchIds, childIds, openState } from "./items"
import type { TreeItem } from "./type"

const items: TreeItem[] = [
    {
        id: "a",
        label: "A",
        children: [
            { id: "a/1", label: "A1" },
            { id: "a/2", label: "A2", children: [{ id: "a/2/x", label: "X" }] },
        ],
    },
    { id: "b", label: "B" },
    { id: "c", label: "C", children: [] },
]

describe("childIds", () => {
    it("returns root ids for an undefined parent", () => {
        expect(childIds(items, undefined)).toEqual(["a", "b", "c"])
    })

    it("returns child ids of a nested parent", () => {
        expect(childIds(items, "a/2")).toEqual(["a/2/x"])
    })

    it("returns an empty list for an unknown parent", () => {
        expect(childIds(items, "missing")).toEqual([])
    })
})

describe("branchIds", () => {
    it("lists ids of items that have children", () => {
        expect(branchIds(items)).toEqual(["a", "a/2"])
    })
})

describe("openState", () => {
    it("marks every branch open or closed by the expanded ids", () => {
        expect(openState(items, ["a/2"])).toEqual({ a: false, "a/2": true })
    })
})

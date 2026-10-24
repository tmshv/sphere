import { describe, expect, it } from "vitest"
import { toTreeMove } from "./move"

describe("toTreeMove", () => {
    it("subtracts dragged siblings above the slot", () => {
        const move = toTreeMove({ dragIds: ["a"], parentId: null, index: 2 }, ["a", "b", "c"])
        expect(move).toEqual({ ids: ["a"], parentId: undefined, index: 1 })
    })

    it("keeps the index when moving up", () => {
        const move = toTreeMove({ dragIds: ["c"], parentId: null, index: 0 }, ["a", "b", "c"])
        expect(move).toEqual({ ids: ["c"], parentId: undefined, index: 0 })
    })

    it("maps the root parent to undefined", () => {
        const move = toTreeMove({ dragIds: ["b"], parentId: null, index: 0 }, ["a", "b"])
        expect(move.parentId).toBeUndefined()
    })

    it("keeps a non-root parent id", () => {
        const move = toTreeMove({ dragIds: ["p/b"], parentId: "p", index: 0 }, ["p/a", "p/b"])
        expect(move).toEqual({ ids: ["p/b"], parentId: "p", index: 0 })
    })

    it("does not shift for ids moving in from another parent", () => {
        const move = toTreeMove({ dragIds: ["x"], parentId: null, index: 2 }, ["a", "b", "c"])
        expect(move.index).toBe(2)
    })
})

import type { DrawFeatureId } from "@/types"
import { applyDelta, drawSelectionIds, featureIds, sameIds, toBackendIds } from "./draw-selection"

const toBackendId = (id: DrawFeatureId): number | undefined => (typeof id === "number" ? id : undefined)

describe("drawSelectionIds", () => {
    test("keeps only the selected ids loaded into draw", () => {
        expect(drawSelectionIds(new Set([1, 2, 3]), new Set<DrawFeatureId>([1, 3, 4]), toBackendId)).toEqual([1, 3])
    })

    test("selects a created feature by its draw id once its backend id is selected", () => {
        const backendId = (id: DrawFeatureId): number | undefined => (id === "draw-a" ? 100 : toBackendId(id))
        expect(drawSelectionIds(new Set([100, 2]), new Set<DrawFeatureId>(["draw-a", 2]), backendId)).toEqual([
            "draw-a",
            2,
        ])
    })

    test("a created feature whose create has not settled is not selected", () => {
        expect(drawSelectionIds(new Set([1]), new Set<DrawFeatureId>(["draw-a"]), toBackendId)).toEqual([])
    })

    test("an empty selection selects nothing", () => {
        expect(drawSelectionIds(new Set(), new Set<DrawFeatureId>([1]), toBackendId)).toEqual([])
    })

    test("looks up only the held features, never walks the whole selection", () => {
        const selected = new Set(Array.from({ length: 1000 }, (_, i) => i))
        const walk = vi.spyOn(selected, Symbol.iterator)
        const has = vi.spyOn(selected, "has")
        expect(drawSelectionIds(selected, new Set<DrawFeatureId>([5, 2000]), toBackendId)).toEqual([5])
        expect(walk).not.toHaveBeenCalled()
        expect(has).toHaveBeenCalledTimes(2)
    })
})

describe("applyDelta", () => {
    test("adds the added ids and removes the removed ones", () => {
        const selected = new Set([1, 2])
        applyDelta(selected, { added: [3], removed: [1] })
        expect([...selected].sort()).toEqual([2, 3])
    })

    test("an empty delta changes nothing", () => {
        const selected = new Set([1])
        applyDelta(selected, { added: [], removed: [] })
        expect([...selected]).toEqual([1])
    })
})

describe("featureIds", () => {
    test("the ids of the features, without the ones that have none", () => {
        expect(featureIds([{ id: 1 }, { id: "draw-a" }, { id: undefined }, { id: 0 }])).toEqual([1, "draw-a", 0])
    })
})

describe("sameIds", () => {
    test("equal whatever the order", () => {
        expect(sameIds([1, "a"], ["a", 1])).toBe(true)
    })

    test("different ids or sizes differ", () => {
        expect(sameIds([1, 2], [1, 3])).toBe(false)
        expect(sameIds([1], [1, 2])).toBe(false)
        expect(sameIds([], [])).toBe(true)
    })
})

describe("toBackendIds", () => {
    test("maps draw ids to backend ids and skips those without one", () => {
        const created = new Map<DrawFeatureId, number>([["draw-a", 100]])
        const backendId = (id: DrawFeatureId) => (typeof id === "number" ? id : created.get(id))
        expect(toBackendIds([1, "draw-a", "draw-b"], backendId)).toEqual([1, 100])
    })
})

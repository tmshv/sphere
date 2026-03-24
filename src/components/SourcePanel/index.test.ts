import { makeGeojsonSource } from "@/testutils"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selectCurrentSourceItem, selector } from "./index"

const makeRootState = (overrides: Record<string, any> = {}) =>
    ({
        selection: { selectedIds: [] },
        layer: { items: {}, allIds: [] },
        source: { items: {}, allIds: [] },
        ...overrides,
    }) as any

describe("selectCurrentSourceItem", () => {
    test("returns null when no source is selected", () => {
        const state = makeRootState({
            source: { items: { s1: makeGeojsonSource("s1") }, allIds: ["s1"] },
        })
        expect(selectCurrentSourceItem(state)).toBeNull()
    })

    test("returns the selected source", () => {
        const source = makeGeojsonSource("s1")
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectCurrentSourceItem(state)).toEqual(source)
    })

    test("returns null when selected id does not exist in items", () => {
        const state = makeRootState({
            source: { items: {}, allIds: [], selectedId: "missing" },
        })
        expect(selectCurrentSourceItem(state)).toBeNull()
    })

    test("is memoized: returns same reference when unrelated source changes", () => {
        const s1 = makeGeojsonSource("s1")
        const s2 = makeGeojsonSource("s2")
        const state1 = makeRootState({
            source: { items: { s1, s2 }, allIds: ["s1", "s2"], selectedId: "s1" },
        })
        const result1 = selectCurrentSourceItem(state1)

        const s2updated = { ...s2, name: "Updated Source s2" }
        const state2 = makeRootState({
            source: { items: { s1, s2: s2updated }, allIds: ["s1", "s2"], selectedId: "s1" },
        })
        const result2 = selectCurrentSourceItem(state2)

        expect(result1).toBe(result2)
    })
})

describe("selector (SourcePanel)", () => {
    test("returns null when no source is selected", () => {
        const state = makeRootState({
            source: { items: {}, allIds: [] },
        })
        expect(selector(state)).toBeNull()
    })

    test("returns null when selected source does not exist", () => {
        const state = makeRootState({
            source: { items: {}, allIds: [], selectedId: "missing" },
        })
        expect(selector(state)).toBeNull()
    })

    test("returns panel data for selected Geojson source", () => {
        const source = makeGeojsonSource("s1")
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        const result = selector(state)
        expect(result).not.toBeNull()
        expect(result?.id).toBe("s1")
        expect(result?.name).toBe("Source s1")
        expect(result?.type).toBe(SourceType.Geojson)
        expect(result?.location).toBe("/path/to/s1.geojson")
        expect(result?.editable).toBe(true)
        expect(result?.reloadDisabled).toBe(false)
    })

    test("reloadDisabled is true for non-reloadable source types", () => {
        const source = {
            ...makeGeojsonSource("s1"),
            type: SourceType.MVT,
            editable: false,
            sourceLayers: [],
            tilejson: { vector_layers: [] },
        }
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        const result = selector(state)
        expect(result?.reloadDisabled).toBe(true)
    })

    test("meta is populated for Geojson sources", () => {
        const source = makeGeojsonSource("s1")
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        const result = selector(state)
        expect(result?.meta).toEqual({ columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 })
    })

    test("meta is populated for FeatureCollection sources", () => {
        const source = {
            id: "s1",
            name: "Source s1",
            type: SourceType.FeatureCollection,
            location: undefined,
            fractionIndex: 0,
            editable: true,
            pending: false,
            dataset: { type: "FeatureCollection", features: [] },
            meta: { columns: {}, pointsCount: 3, linesCount: 1, polygonsCount: 2 },
        }
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        const result = selector(state)
        expect(result?.meta).toEqual({ columns: {}, pointsCount: 3, linesCount: 1, polygonsCount: 2 })
    })

    test("is memoized: returns same reference when unrelated source changes", () => {
        const s1 = makeGeojsonSource("s1")
        const s2 = makeGeojsonSource("s2")
        const state1 = makeRootState({
            source: { items: { s1, s2 }, allIds: ["s1", "s2"], selectedId: "s1" },
        })
        const result1 = selector(state1)

        const s2updated = { ...s2, name: "Updated Source s2" }
        const state2 = makeRootState({
            source: { items: { s1, s2: s2updated }, allIds: ["s1", "s2"], selectedId: "s1" },
        })
        const result2 = selector(state2)

        expect(result1).toBe(result2)
    })

    test("recomputes when the selected source itself changes", () => {
        const s1 = makeGeojsonSource("s1", { name: "Original" })
        const state1 = makeRootState({
            source: { items: { s1 }, allIds: ["s1"], selectedId: "s1" },
        })
        const result1 = selector(state1)

        const s1updated = { ...s1, name: "Updated" }
        const state2 = makeRootState({
            source: { items: { s1: s1updated }, allIds: ["s1"], selectedId: "s1" },
        })
        const result2 = selector(state2)

        expect(result1).not.toBe(result2)
        expect(result2?.name).toBe("Updated")
    })
})

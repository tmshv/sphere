import { makeGeojsonSource } from "@/testutils"
import { LayerType } from "@/types"
import { describe, expect, test } from "vitest"
import { layerSelector, selectCurrentLayerItem, selectCurrentLayerSourceItem } from "./index"

const makeLayer = (id: string, overrides: Record<string, any> = {}) => ({
    id,
    name: `Layer ${id}`,
    visible: true,
    fractionIndex: 0,
    color: "#ff0000",
    type: LayerType.Point,
    circle: { minRadius: 2, maxRadius: 6 },
    ...overrides,
})

const makeRootState = (overrides: Record<string, any> = {}) =>
    ({
        selection: { selectedIds: [] },
        layer: { items: {}, allIds: [] },
        source: { items: {}, allIds: [] },
        ...overrides,
    }) as any

describe("selectCurrentLayerItem", () => {
    test("returns null when no layer is selected", () => {
        const state = makeRootState({
            layer: { items: { l1: makeLayer("l1") }, allIds: ["l1"] },
        })
        expect(selectCurrentLayerItem(state)).toBeNull()
    })

    test("returns the selected layer", () => {
        const layer = makeLayer("l1")
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
        })
        expect(selectCurrentLayerItem(state)).toEqual(layer)
    })

    test("returns null when selected id does not exist in items", () => {
        const state = makeRootState({
            layer: { items: {}, allIds: [], selectedId: "missing" },
        })
        expect(selectCurrentLayerItem(state)).toBeNull()
    })

    test("is memoized: returns same reference when unrelated layer changes", () => {
        const l1 = makeLayer("l1")
        const l2 = makeLayer("l2", { color: "#0000ff" })
        const state1 = makeRootState({
            layer: { items: { l1, l2 }, allIds: ["l1", "l2"], selectedId: "l1" },
        })
        const result1 = selectCurrentLayerItem(state1)

        const l2updated = { ...l2, color: "#00ff00" }
        const state2 = makeRootState({
            layer: { items: { l1, l2: l2updated }, allIds: ["l1", "l2"], selectedId: "l1" },
        })
        const result2 = selectCurrentLayerItem(state2)

        expect(result1).toBe(result2)
    })
})

describe("selectCurrentLayerSourceItem", () => {
    test("returns null when no layer is selected", () => {
        const state = makeRootState({
            layer: { items: {}, allIds: [] },
            source: { items: {}, allIds: [] },
        })
        expect(selectCurrentLayerSourceItem(state)).toBeNull()
    })

    test("returns null when layer has no sourceId", () => {
        const layer = makeLayer("l1", { sourceId: undefined })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: {}, allIds: [] },
        })
        expect(selectCurrentLayerSourceItem(state)).toBeNull()
    })

    test("returns the source for the selected layer", () => {
        const source = makeGeojsonSource("s1")
        const layer = makeLayer("l1", { sourceId: "s1" })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1: source }, allIds: ["s1"] },
        })
        expect(selectCurrentLayerSourceItem(state)).toEqual(source)
    })

    test("is memoized: returns same reference when unrelated source changes", () => {
        const s1 = makeGeojsonSource("s1")
        const s2 = makeGeojsonSource("s2")
        const layer = makeLayer("l1", { sourceId: "s1" })
        const state1 = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1, s2 }, allIds: ["s1", "s2"] },
        })
        const result1 = selectCurrentLayerSourceItem(state1)

        const s2updated = { ...s2, name: "Updated Source s2" }
        const state2 = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1, s2: s2updated }, allIds: ["s1", "s2"] },
        })
        const result2 = selectCurrentLayerSourceItem(state2)

        expect(result1).toBe(result2)
    })
})

describe("layerSelector", () => {
    test("returns null when no layer is selected", () => {
        const state = makeRootState({
            layer: { items: {}, allIds: [] },
            source: { items: {}, allIds: [] },
        })
        expect(layerSelector(state)).toBeNull()
    })

    test("returns panel data for a selected Point layer", () => {
        const source = makeGeojsonSource("s1")
        const layer = makeLayer("l1", { sourceId: "s1", type: LayerType.Point })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1: source }, allIds: ["s1"] },
        })
        const result = layerSelector(state)
        expect(result).not.toBeNull()
        expect(result?.id).toBe("l1")
        expect(result?.name).toBe("Layer l1")
        expect(result?.type).toBe(LayerType.Point)
        expect(result?.color).toBe("#ff0000")
        expect(result?.sourceId).toBe("s1")
        expect(result?.circleRange).toEqual([2, 6])
    })

    test("returns panel data with fields from Geojson source", () => {
        const source = makeGeojsonSource("s1", {
            meta: {
                columns: { name: "String", value: "Number", count: "Number" },
                pointsCount: 0,
                linesCount: 0,
                polygonsCount: 0,
            },
        })
        const layer = makeLayer("l1", { sourceId: "s1" })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1: source }, allIds: ["s1"] },
        })
        const result = layerSelector(state)
        expect(result?.fields).toContain("name")
        expect(result?.fields).toContain("value")
        expect(result?.fields).toContain("count")
    })

    test("returns empty fields when layer has no source", () => {
        const layer = makeLayer("l1", { sourceId: undefined })
        const state = makeRootState({
            layer: { items: { l1: layer }, allIds: ["l1"], selectedId: "l1" },
            source: { items: {}, allIds: [] },
        })
        const result = layerSelector(state)
        expect(result?.fields).toEqual([])
    })

    test("is memoized: returns same reference when unrelated layer changes", () => {
        const s1 = makeGeojsonSource("s1")
        const l1 = makeLayer("l1", { sourceId: "s1" })
        const l2 = makeLayer("l2", { sourceId: "s1", color: "#0000ff" })
        const state1 = makeRootState({
            layer: { items: { l1, l2 }, allIds: ["l1", "l2"], selectedId: "l1" },
            source: { items: { s1 }, allIds: ["s1"] },
        })
        const result1 = layerSelector(state1)

        const l2updated = { ...l2, color: "#00ff00" }
        const state2 = makeRootState({
            layer: { items: { l1, l2: l2updated }, allIds: ["l1", "l2"], selectedId: "l1" },
            source: { items: { s1 }, allIds: ["s1"] },
        })
        const result2 = layerSelector(state2)

        expect(result1).toBe(result2)
    })

    test("is memoized: returns same reference when unrelated source changes", () => {
        const s1 = makeGeojsonSource("s1")
        const s2 = makeGeojsonSource("s2")
        const l1 = makeLayer("l1", { sourceId: "s1" })
        const state1 = makeRootState({
            layer: { items: { l1 }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1, s2 }, allIds: ["s1", "s2"] },
        })
        const result1 = layerSelector(state1)

        const s2updated = { ...s2, name: "Updated" }
        const state2 = makeRootState({
            layer: { items: { l1 }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1, s2: s2updated }, allIds: ["s1", "s2"] },
        })
        const result2 = layerSelector(state2)

        expect(result1).toBe(result2)
    })

    test("recomputes when the selected layer itself changes", () => {
        const s1 = makeGeojsonSource("s1")
        const l1 = makeLayer("l1", { sourceId: "s1", color: "#ff0000" })
        const state1 = makeRootState({
            layer: { items: { l1 }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1 }, allIds: ["s1"] },
        })
        const result1 = layerSelector(state1)

        const l1updated = { ...l1, color: "#00ff00" }
        const state2 = makeRootState({
            layer: { items: { l1: l1updated }, allIds: ["l1"], selectedId: "l1" },
            source: { items: { s1 }, allIds: ["s1"] },
        })
        const result2 = layerSelector(state2)

        expect(result1).not.toBe(result2)
        expect(result2?.color).toBe("#00ff00")
    })
})

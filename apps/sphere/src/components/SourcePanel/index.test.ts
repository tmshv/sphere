import { makeCsvSource, makeGeojsonSource, makeMvtSource } from "@/testutils"
import type { RootState } from "@/store"
import { selectCurrentSourceItem } from "@/store/source"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selector, selectPanelKind } from "./index"

const makeRootState = (overrides: object = {}) =>
    ({
        selection: { count: 0, version: 0 },
        layer: { items: {}, allIds: [] },
        source: { items: {}, allIds: [] },
        ...overrides,
    }) as unknown as RootState

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
        expect(result?.editable).toBe(false)
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
        expect(result?.meta).toEqual({
            columns: {},
            pointsCount: 0,
            multiPointsCount: 0,
            linesCount: 0,
            multiLinesCount: 0,
            polygonsCount: 0,
            multiPolygonsCount: 0,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 0,
        })
    })

    test("meta is populated for FeatureCollection sources", () => {
        const meta = {
            columns: {},
            pointsCount: 3,
            multiPointsCount: 0,
            linesCount: 1,
            multiLinesCount: 0,
            polygonsCount: 2,
            multiPolygonsCount: 0,
            collectionsCount: 0,
            nullGeometryCount: 0,
            featuresCount: 6,
        }
        const source = {
            id: "s1",
            name: "Source s1",
            type: SourceType.FeatureCollection,
            location: "sphere://s1",
            version: 0,
            fractionIndex: 0,
            editable: true,
            pending: false,
            meta,
        }
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        const result = selector(state)
        expect(result?.meta).toEqual(meta)
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

describe("selectPanelKind", () => {
    test("returns null when nothing is selected", () => {
        const state = makeRootState({ source: { items: {}, allIds: [] } })
        expect(selectPanelKind(state)).toBeNull()
    })

    test("routes a csv-format Geojson source to the csv panel", () => {
        const source = makeCsvSource("s1")
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("csv")
    })

    test("routes a geojson-format source to the geojson panel", () => {
        const state = makeRootState({
            source: { items: { s1: makeGeojsonSource("s1") }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("geojson")
    })

    test("routes a FeatureCollection source to the geojson panel", () => {
        const source = {
            id: "s1",
            name: "drawn",
            type: SourceType.FeatureCollection,
            location: "sphere://s1",
            version: 0,
            fractionIndex: 0,
            editable: true,
            pending: false,
            meta: { columns: {} },
        }
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("geojson")
    })

    test("routes an MVT source with a pbf format to the vector tiles panel", () => {
        const source = makeMvtSource("s1", { format: "pbf" as const })
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("vector-tiles")
    })

    test("routes an MVT source with a raster tile format to the raster tiles panel", () => {
        const source = makeMvtSource("s1", { format: "png" as const })
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("raster-tiles")
    })

    test("routes a Raster source to the raster tiles panel", () => {
        const source = { ...makeGeojsonSource("s1"), type: SourceType.Raster }
        const state = makeRootState({
            source: { items: { s1: source }, allIds: ["s1"], selectedId: "s1" },
        })
        expect(selectPanelKind(state)).toBe("raster-tiles")
    })
})

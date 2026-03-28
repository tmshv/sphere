import { STYLE_OSM } from "@/const"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selectChangeProjectionAvailable, selectMapStyle, selectors } from "./selectors"

const makeRootState = (overrides: Record<string, any> = {}) =>
    ({
        draw: { sourceId: undefined },
        projection: { value: "globe" },
        mapStyle: { value: "some-style" },
        layer: { items: {}, allIds: [] },
        app: { activeSidebarTab: "sources" },
        selection: { count: 0, version: 0 },
        source: { items: {} },
        ...overrides,
    }) as any

describe("selectProjection", () => {
    test("returns state projection when not drawing", () => {
        const state = makeRootState({ draw: { sourceId: undefined }, projection: { value: "globe" } })
        expect(selectors.projection.projection(state)).toBe("globe")
    })

    test("returns mercator when drawing", () => {
        const state = makeRootState({ draw: { sourceId: "s1" }, projection: { value: "globe" } })
        expect(selectors.projection.projection(state)).toBe("mercator")
    })

    test("returns state projection value when not drawing and value is mercator", () => {
        const state = makeRootState({ draw: { sourceId: undefined }, projection: { value: "mercator" } })
        expect(selectors.projection.projection(state)).toBe("mercator")
    })
})

describe("selectMapStyle", () => {
    test("returns state mapStyle when not drawing", () => {
        const state = makeRootState({ draw: { sourceId: undefined }, mapStyle: { value: "custom-style" } })
        expect(selectMapStyle(state)).toBe("custom-style")
    })

    test("returns STYLE_OSM when drawing", () => {
        const state = makeRootState({ draw: { sourceId: "s1" }, mapStyle: { value: "custom-style" } })
        expect(selectMapStyle(state)).toBe(STYLE_OSM)
    })
})

describe("selectChangeProjectionAvailable", () => {
    test("returns true when not drawing", () => {
        const state = makeRootState({ draw: { sourceId: undefined } })
        expect(selectChangeProjectionAvailable(state)).toBe(true)
    })

    test("returns false when drawing", () => {
        const state = makeRootState({ draw: { sourceId: "s1" } })
        expect(selectChangeProjectionAvailable(state)).toBe(false)
    })
})

describe("selectPreviewSourceId", () => {
    const geojsonSource = { type: SourceType.Geojson, pending: false }
    const fcSource = { type: SourceType.FeatureCollection, pending: false }
    const mvtSource = { type: SourceType.MVT, pending: false }

    test("returns undefined when not on sources tab", () => {
        const state = makeRootState({
            app: { activeSidebarTab: "layers" },
            source: { items: { s1: geojsonSource }, selectedId: "s1" },
        })
        expect(selectors.preview.sourceId(state)).toBeUndefined()
    })

    test("returns undefined when no source is selected", () => {
        const state = makeRootState({
            source: { items: { s1: geojsonSource } },
        })
        expect(selectors.preview.sourceId(state)).toBeUndefined()
    })

    test("returns undefined when selected source does not exist in items", () => {
        const state = makeRootState({
            source: { items: {}, selectedId: "missing" },
        })
        expect(selectors.preview.sourceId(state)).toBeUndefined()
    })

    test("returns sourceId when source type is MVT", () => {
        const state = makeRootState({
            source: { items: { s1: mvtSource }, selectedId: "s1" },
        })
        expect(selectors.preview.sourceId(state)).toBe("s1")
    })

    test("returns undefined when source is pending", () => {
        const state = makeRootState({
            source: { items: { s1: { ...geojsonSource, pending: true } }, selectedId: "s1" },
        })
        expect(selectors.preview.sourceId(state)).toBeUndefined()
    })

    test("returns undefined when MVT source is pending", () => {
        const state = makeRootState({
            source: { items: { s1: { ...mvtSource, pending: true } }, selectedId: "s1" },
        })
        expect(selectors.preview.sourceId(state)).toBeUndefined()
    })

    test("returns sourceId for Geojson source on sources tab", () => {
        const state = makeRootState({
            source: { items: { s1: geojsonSource }, selectedId: "s1" },
        })
        expect(selectors.preview.sourceId(state)).toBe("s1")
    })

    test("returns sourceId for FeatureCollection source on sources tab", () => {
        const state = makeRootState({
            source: { items: { s1: fcSource }, selectedId: "s1" },
        })
        expect(selectors.preview.sourceId(state)).toBe("s1")
    })
})

describe("selectPreviewLayerIds", () => {
    const geojsonSource = { type: SourceType.Geojson, pending: false }
    const fcSource = { type: SourceType.FeatureCollection, pending: false }
    const rasterSource = { type: SourceType.Raster, pending: false }
    const mvtSource = {
        type: SourceType.MVT,
        pending: false,
        sourceLayers: [
            { id: "roads", name: "Roads" },
            { id: "water", name: "Water" },
        ],
    }

    test("returns empty array when not on sources tab", () => {
        const state = makeRootState({
            app: { activeSidebarTab: "layers" },
            source: { items: { s1: geojsonSource }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("returns empty array when no source selected", () => {
        const state = makeRootState({
            source: { items: { s1: geojsonSource } },
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("returns empty array when selected source does not exist in items", () => {
        const state = makeRootState({
            source: { items: {}, selectedId: "missing" },
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("returns 3 IDs for GeoJSON source", () => {
        const state = makeRootState({
            source: { items: { s1: geojsonSource }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual(["preview-s1-point", "preview-s1-line", "preview-s1-polygon"])
    })

    test("returns 3 IDs for FeatureCollection source", () => {
        const state = makeRootState({
            source: { items: { s1: fcSource }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual(["preview-s1-point", "preview-s1-line", "preview-s1-polygon"])
    })

    test("returns 3 * sourceLayers.length IDs for MVT source", () => {
        const state = makeRootState({
            source: { items: { s1: mvtSource }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual([
            "preview-s1-roads-point",
            "preview-s1-roads-line",
            "preview-s1-roads-polygon",
            "preview-s1-water-point",
            "preview-s1-water-line",
            "preview-s1-water-polygon",
        ])
    })

    test("returns empty array for Raster source", () => {
        const state = makeRootState({
            source: { items: { s1: rasterSource }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("returns empty array when source is pending", () => {
        const state = makeRootState({
            source: { items: { s1: { ...geojsonSource, pending: true } }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("returns empty array when MVT source is pending", () => {
        const state = makeRootState({
            source: { items: { s1: { ...mvtSource, pending: true } }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("returns empty array for MVT source with no sourceLayers", () => {
        const state = makeRootState({
            source: { items: { s1: { ...mvtSource, sourceLayers: [] } }, selectedId: "s1" },
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })
})

describe("visibleIds", () => {
    test("returns only ids of visible layers", () => {
        const state = makeRootState({
            layer: {
                items: {
                    l1: { id: "l1", visible: true },
                    l2: { id: "l2", visible: false },
                    l3: { id: "l3", visible: true },
                },
                allIds: ["l1", "l2", "l3"],
            },
        })
        expect(selectors.layer.visibleIds(state)).toEqual(["l1", "l3"])
    })

    test("returns empty array when no layers are visible", () => {
        const state = makeRootState({
            layer: {
                items: {
                    l1: { id: "l1", visible: false },
                },
                allIds: ["l1"],
            },
        })
        expect(selectors.layer.visibleIds(state)).toEqual([])
    })

    test("returns all ids when all layers are visible", () => {
        const state = makeRootState({
            layer: {
                items: {
                    l1: { id: "l1", visible: true },
                    l2: { id: "l2", visible: true },
                },
                allIds: ["l1", "l2"],
            },
        })
        expect(selectors.layer.visibleIds(state)).toEqual(["l1", "l2"])
    })

    test("returns empty array when no layers exist", () => {
        const state = makeRootState({
            layer: { items: {}, allIds: [] },
        })
        expect(selectors.layer.visibleIds(state)).toEqual([])
    })
})

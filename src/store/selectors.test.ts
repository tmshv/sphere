import { STYLE_OSM } from "@/const"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { selectChangeProjectionAvailable, selectMapStyle, selectPreviewSourceId, selectors } from "./selectors"

const makeRootState = (overrides: Record<string, any> = {}) =>
    ({
        draw: { sourceId: undefined },
        projection: { value: "globe" },
        mapStyle: { value: "some-style" },
        layer: { items: {}, allIds: [] },
        app: { activeSidebarTab: "sources" },
        selection: { sourceId: undefined },
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
            selection: { sourceId: "s1" },
            source: { items: { s1: geojsonSource } },
        })
        expect(selectPreviewSourceId(state)).toBeUndefined()
    })

    test("returns undefined when no source is selected", () => {
        const state = makeRootState({
            selection: { sourceId: undefined },
            source: { items: { s1: geojsonSource } },
        })
        expect(selectPreviewSourceId(state)).toBeUndefined()
    })

    test("returns undefined when selected source does not exist in items", () => {
        const state = makeRootState({
            selection: { sourceId: "missing" },
            source: { items: {} },
        })
        expect(selectPreviewSourceId(state)).toBeUndefined()
    })

    test("returns undefined when source type is MVT", () => {
        const state = makeRootState({
            selection: { sourceId: "s1" },
            source: { items: { s1: mvtSource } },
        })
        expect(selectPreviewSourceId(state)).toBeUndefined()
    })

    test("returns undefined when source is pending", () => {
        const state = makeRootState({
            selection: { sourceId: "s1" },
            source: { items: { s1: { ...geojsonSource, pending: true } } },
        })
        expect(selectPreviewSourceId(state)).toBeUndefined()
    })

    test("returns sourceId for Geojson source on sources tab", () => {
        const state = makeRootState({
            selection: { sourceId: "s1" },
            source: { items: { s1: geojsonSource } },
        })
        expect(selectPreviewSourceId(state)).toBe("s1")
    })

    test("returns sourceId for FeatureCollection source on sources tab", () => {
        const state = makeRootState({
            selection: { sourceId: "s1" },
            source: { items: { s1: fcSource } },
        })
        expect(selectPreviewSourceId(state)).toBe("s1")
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

import { makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"
import { LayerType, SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import type { RootState } from "./index"
import { selectPopupEntries, selectPopupVisible } from "./properties"
import { selectChangeProjectionAvailable, selectMapLayers, selectMapStyle, selectors } from "./selectors"

const makeRootState = (overrides: Record<string, unknown> = {}) =>
    ({
        draw: { sourceId: undefined },
        projection: { value: "globe" },
        mapStyle: { value: "some-style" },
        layer: { items: {}, allIds: [] },
        app: { activeSidebarTab: "sources" },
        selection: { count: 0, version: 0 },
        source: makeSourceState([]),
        ...overrides,
    }) as unknown as RootState

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

    test("keeps the state mapStyle when drawing", () => {
        const state = makeRootState({ draw: { sourceId: "s1" }, mapStyle: { value: "custom-style" } })
        expect(selectMapStyle(state)).toBe("custom-style")
    })
})

describe("selectMapLayers", () => {
    const layerState = {
        items: {
            top: { id: "top", fractionIndex: 0.9, type: LayerType.Point },
            base: { id: "base", fractionIndex: -1, type: LayerType.Raster },
            mid: { id: "mid", fractionIndex: 0.5 },
        },
        allIds: ["top", "base", "mid"],
    }

    test("lists every layer by fraction index", () => {
        const state = makeRootState({ app: { activeSidebarTab: "layers" }, layer: layerState })
        expect(selectMapLayers(state).map(layer => layer.id)).toEqual(["base", "mid", "top"])
    })

    test("keeps only raster layers while drawing", () => {
        const state = makeRootState({
            app: { activeSidebarTab: "layers" },
            draw: { sourceId: "s1" },
            layer: layerState,
        })
        expect(selectMapLayers(state).map(layer => layer.id)).toEqual(["base"])
    })

    test("is empty while a source preview is active", () => {
        const state = makeRootState({ source: makeSourceState([makeGeojsonSource("a")]), layer: layerState })
        expect(selectMapLayers(state)).toEqual([])
    })

    test("is empty on Sources tab when every source is hidden", () => {
        const state = makeRootState({
            source: makeSourceState([makeGeojsonSource("a")], { hiddenIds: ["a"] }),
            layer: layerState,
        })
        expect(selectMapLayers(state)).toEqual([])
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

describe("selectPreviewLayerSpecs", () => {
    const geojson = (id: string) => makeGeojsonSource(id)
    const roadsMvt = makeMvtSource("m1", {
        sourceLayers: [
            { id: "roads", name: "Roads" },
            { id: "water", name: "Water" },
        ],
    })

    test("two visible roots give 6 specs with the first root last", () => {
        const state = makeRootState({ source: makeSourceState([geojson("a"), geojson("b")]) })
        const specs = selectors.preview.layerSpecs(state)
        expect(specs.map(spec => spec.layerId)).toEqual([
            "preview-b-polygon",
            "preview-b-line",
            "preview-b-point",
            "preview-a-polygon",
            "preview-a-line",
            "preview-a-point",
        ])
        expect(specs.map(spec => spec.nodeId)).toEqual(["b", "b", "b", "a", "a", "a"])
    })

    test("hidden root gives no specs", () => {
        const state = makeRootState({ source: makeSourceState([geojson("a")], { hiddenIds: ["a"] }) })
        expect(selectors.preview.layerSpecs(state)).toEqual([])
    })

    test("pending source gives no specs", () => {
        const state = makeRootState({ source: makeSourceState([makeGeojsonSource("a", { pending: true })]) })
        expect(selectors.preview.layerSpecs(state)).toEqual([])
    })

    test("MVT root draws only visible children", () => {
        const state = makeRootState({ source: makeSourceState([roadsMvt], { hiddenIds: ["m1/water"] }) })
        const specs = selectors.preview.layerSpecs(state)
        expect(specs).toHaveLength(3)
        for (const spec of specs) {
            expect(spec).toMatchObject({ sourceId: "m1", sourceLayer: "roads", nodeId: "m1/roads" })
        }
    })

    test("hidden parent hides its children", () => {
        const state = makeRootState({ source: makeSourceState([roadsMvt], { hiddenIds: ["m1"] }) })
        expect(selectors.preview.layerSpecs(state)).toEqual([])
    })

    test("raster MBTiles gives one raster spec", () => {
        const state = makeRootState({ source: makeSourceState([makeMvtSource("r1", { format: "png" })]) })
        expect(selectors.preview.layerSpecs(state)).toEqual([
            { kind: "Raster", layerId: "preview-r1-raster", sourceId: "r1", nodeId: "r1" },
        ])
    })

    test("web raster source gives one raster spec", () => {
        const raster = { id: "w1", name: "Web", type: SourceType.Raster, location: "", editable: false, pending: false }
        const state = makeRootState({ source: makeSourceState([raster]) })
        expect(selectors.preview.layerSpecs(state)).toEqual([
            { kind: "Raster", layerId: "preview-w1-raster", sourceId: "w1", nodeId: "w1" },
        ])
    })

    test("Layers tab gives no specs", () => {
        const state = makeRootState({
            app: { activeSidebarTab: "layers" },
            source: makeSourceState([geojson("a")]),
        })
        expect(selectors.preview.layerSpecs(state)).toEqual([])
    })
})

describe("selectPreviewLayerStack", () => {
    test("lists specs top first, each placed below the bottom layer of the spec above", () => {
        const state = makeRootState({ source: makeSourceState([makeGeojsonSource("a"), makeGeojsonSource("b")]) })
        const stack = selectors.preview.layerStack(state)
        expect(stack.map(({ spec, beforeId }) => [spec.layerId, beforeId])).toEqual([
            ["preview-a-point", undefined],
            ["preview-a-line", "preview-a-point"],
            ["preview-a-polygon", "preview-a-line-outline"],
            ["preview-b-point", "preview-a-polygon"],
            ["preview-b-line", "preview-b-point"],
            ["preview-b-polygon", "preview-b-line-outline"],
        ])
    })

    test("is empty without specs", () => {
        expect(selectors.preview.layerStack(makeRootState())).toEqual([])
    })
})

describe("selectPreviewDrawOrder", () => {
    test("lists every MapLibre layer of the preview bottom to top", () => {
        const state = makeRootState({
            source: makeSourceState([makeGeojsonSource("a"), makeMvtSource("r1", { format: "png" })]),
        })
        expect(selectors.preview.drawOrder(state)).toEqual([
            "preview-r1-raster",
            "preview-a-polygon",
            "preview-a-polygon-outline-0",
            "preview-a-polygon-outline-1",
            "preview-a-line-outline",
            "preview-a-line",
            "preview-a-point",
        ])
    })
})

describe("selectPreviewActive", () => {
    test("true on Sources tab with a visible source", () => {
        const state = makeRootState({ source: makeSourceState([makeGeojsonSource("a")]) })
        expect(selectors.preview.active(state)).toBe(true)
    })

    test("false on Layers tab", () => {
        const state = makeRootState({
            app: { activeSidebarTab: "layers" },
            source: makeSourceState([makeGeojsonSource("a")]),
        })
        expect(selectors.preview.active(state)).toBe(false)
    })

    test("true on Sources tab when nothing is visible", () => {
        const state = makeRootState({ source: makeSourceState([makeGeojsonSource("a")], { hiddenIds: ["a"] }) })
        expect(selectors.preview.active(state)).toBe(true)
    })

    test("true on Sources tab without sources", () => {
        expect(selectors.preview.active(makeRootState())).toBe(true)
    })
})

describe("selectPreviewLayerIds", () => {
    const mvtSource = makeMvtSource("m1", {
        sourceLayers: [
            { id: "roads", name: "Roads" },
            { id: "water", name: "Water" },
        ],
    })

    test("empty on Layers tab", () => {
        const state = makeRootState({
            app: { activeSidebarTab: "layers" },
            source: makeSourceState([makeGeojsonSource("s1")], { selectedIds: ["s1"] }),
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("empty when nothing is selected", () => {
        const state = makeRootState({ source: makeSourceState([makeGeojsonSource("s1")]) })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("empty when selected node does not exist", () => {
        const state = makeRootState({ source: makeSourceState([], { selectedIds: ["missing"] }) })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("3 ids for a GeoJSON source, ignoring other visible roots", () => {
        const state = makeRootState({
            source: makeSourceState([makeGeojsonSource("s1"), makeGeojsonSource("s2")], { selectedIds: ["s1"] }),
        })
        expect(selectors.preview.layerIds(state)).toEqual(["preview-s1-polygon", "preview-s1-line", "preview-s1-point"])
    })

    test("selected source-layer gives its 3 ids even with another root visible", () => {
        const state = makeRootState({
            source: makeSourceState([mvtSource, makeGeojsonSource("s2")], { selectedIds: ["m1/roads"] }),
        })
        expect(selectors.preview.layerIds(state)).toEqual([
            "preview-m1-roads-polygon",
            "preview-m1-roads-line",
            "preview-m1-roads-point",
        ])
    })

    test("selected MVT root gives visible children ids only", () => {
        const state = makeRootState({
            source: makeSourceState([mvtSource], { selectedIds: ["m1"], hiddenIds: ["m1/water"] }),
        })
        expect(selectors.preview.layerIds(state)).toEqual([
            "preview-m1-roads-polygon",
            "preview-m1-roads-line",
            "preview-m1-roads-point",
        ])
    })

    test("empty when selected node is hidden", () => {
        const state = makeRootState({
            source: makeSourceState([makeGeojsonSource("s1")], { selectedIds: ["s1"], hiddenIds: ["s1"] }),
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("empty for raster source", () => {
        const state = makeRootState({
            source: makeSourceState([makeMvtSource("r1", { format: "png" })], { selectedIds: ["r1"] }),
        })
        expect(selectors.preview.layerIds(state)).toEqual([])
    })

    test("empty when source is pending", () => {
        const state = makeRootState({
            source: makeSourceState([makeGeojsonSource("s1", { pending: true })], { selectedIds: ["s1"] }),
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

function makePopupState(partial: {
    mapTool: "navigation" | "select" | "info"
    entries?: { id: number | string; values: Record<string, unknown> }[]
    hoverEntries?: { id: number | string; values: Record<string, unknown> }[]
}): RootState {
    return {
        app: { mapTool: partial.mapTool },
        properties: {
            entries: partial.entries,
            hoverEntries: partial.hoverEntries,
        },
    } as unknown as RootState
}

describe("selectPopupVisible", () => {
    test("true only for info", () => {
        expect(selectPopupVisible(makePopupState({ mapTool: "info" }))).toBe(true)
        expect(selectPopupVisible(makePopupState({ mapTool: "select" }))).toBe(false)
        expect(selectPopupVisible(makePopupState({ mapTool: "navigation" }))).toBe(false)
    })
})

describe("selectPopupEntries", () => {
    const selectionEntries = [{ id: 1, values: { k: "s" } }]
    const hoverEntries = [{ id: 2, values: { k: "h" } }]

    test("null when popup not visible", () => {
        expect(
            selectPopupEntries(makePopupState({ mapTool: "navigation", entries: selectionEntries, hoverEntries })),
        ).toBeNull()
        expect(
            selectPopupEntries(makePopupState({ mapTool: "select", entries: selectionEntries, hoverEntries })),
        ).toBeNull()
    })

    test("hover wins when info and hover is non-empty", () => {
        const result = selectPopupEntries(makePopupState({ mapTool: "info", entries: selectionEntries, hoverEntries }))
        expect(result).toHaveLength(1)
        expect(result?.[0].id).toBe(2)
    })

    test("selection is returned when hover is empty", () => {
        const result = selectPopupEntries(makePopupState({ mapTool: "info", entries: selectionEntries }))
        expect(result).toHaveLength(1)
        expect(result?.[0].id).toBe(1)
    })

    test("null when both sources empty", () => {
        expect(selectPopupEntries(makePopupState({ mapTool: "info" }))).toBeNull()
    })
})

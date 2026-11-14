import { describe, expect, test, vi } from "vitest"
import type { LayerSpecification, Map as MaplibreMap } from "maplibre-gl"
import MapLibreDraw, { spherePreset } from "@sphere/draw"
import { isOverDrawFeature } from "./draw-hit"

type HitMap = Pick<MaplibreMap, "getStyle" | "queryRenderedFeatures">

const PRESET = { color: "black", highlightColor: "red", outline: true, pointRadius: 3 }

// The style layers draw adds to the map: the app's preset, resolved by draw's own options setup
function drawLayers(): LayerSpecification[] {
    return new MapLibreDraw({ styles: spherePreset(PRESET) }).options.styles
}

// App layers that share the map with draw; the hillshade id starts with the preset's prefix too
const APP_LAYERS: LayerSpecification[] = [
    { id: "background", type: "background" },
    { id: "basemap", type: "raster", source: "osm" },
    { id: "sphere-hillshade", type: "hillshade", source: "hillshade-dem-1" },
    { id: "preview-s1-polygon", type: "fill", source: "s1" },
]

function makeMap(layers: LayerSpecification[], hits: unknown[]) {
    const queryRenderedFeatures = vi.fn(() => hits)
    // Stub of the two map methods the helper reads; the real types are far wider
    const map = {
        getStyle: () => ({ layers }),
        queryRenderedFeatures,
    } as unknown as HitMap
    return { map, queryRenderedFeatures }
}

describe("isOverDrawFeature", () => {
    test("queries exactly the layers of the app's draw preset", () => {
        const draw = drawLayers()
        const { map, queryRenderedFeatures } = makeMap([...APP_LAYERS, ...draw], [{}])
        expect(isOverDrawFeature(map, { x: 10, y: 20 })).toBe(true)
        expect(queryRenderedFeatures).toHaveBeenCalledWith([10, 20], { layers: draw.map(layer => layer.id) })
    })

    test("is false when no draw layer has a feature at the point", () => {
        const { map } = makeMap([...APP_LAYERS, ...drawLayers()], [])
        expect(isOverDrawFeature(map, { x: 1, y: 2 })).toBe(false)
    })

    test("is false without querying when the style has no draw layers", () => {
        const { map, queryRenderedFeatures } = makeMap(APP_LAYERS, [{}])
        expect(isOverDrawFeature(map, { x: 1, y: 2 })).toBe(false)
        expect(queryRenderedFeatures).not.toHaveBeenCalled()
    })
})

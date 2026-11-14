import { describe, expect, test, vi } from "vitest"
import type { Map as MaplibreMap } from "maplibre-gl"
import { isOverDrawFeature } from "./draw-hit"

type HitMap = Pick<MaplibreMap, "getStyle" | "queryRenderedFeatures">

function makeMap(layerIds: string[], hits: unknown[]) {
    const queryRenderedFeatures = vi.fn(() => hits)
    // Stub of the two map methods the helper reads; the real types are far wider
    const map = {
        getStyle: () => ({ layers: layerIds.map(id => ({ id })) }),
        queryRenderedFeatures,
    } as unknown as HitMap
    return { map, queryRenderedFeatures }
}

describe("isOverDrawFeature", () => {
    test("is true when a draw layer has a feature at the point", () => {
        const { map, queryRenderedFeatures } = makeMap(["bg", "gl-draw-polygon-fill.cold"], [{}])
        expect(isOverDrawFeature(map, { x: 10, y: 20 })).toBe(true)
        expect(queryRenderedFeatures).toHaveBeenCalledWith([10, 20], { layers: ["gl-draw-polygon-fill.cold"] })
    })

    test("is false when no draw layer has a feature at the point", () => {
        const { map } = makeMap(["gl-draw-line.hot"], [])
        expect(isOverDrawFeature(map, { x: 1, y: 2 })).toBe(false)
    })

    test("is false without querying when the style has no draw layers", () => {
        const { map, queryRenderedFeatures } = makeMap(["bg"], [{}])
        expect(isOverDrawFeature(map, { x: 1, y: 2 })).toBe(false)
        expect(queryRenderedFeatures).not.toHaveBeenCalled()
    })
})

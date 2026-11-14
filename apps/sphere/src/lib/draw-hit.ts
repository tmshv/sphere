import type { Map as MaplibreMap } from "maplibre-gl"

const DRAW_LAYER_PREFIX = "gl-draw-"

/** True when a feature of the draw control is rendered at the point (map pixels). */
export function isOverDrawFeature(
    map: Pick<MaplibreMap, "getStyle" | "queryRenderedFeatures">,
    point: { x: number; y: number },
): boolean {
    const layers = map
        .getStyle()
        .layers.map(layer => layer.id)
        .filter(id => id.startsWith(DRAW_LAYER_PREFIX))
    if (layers.length === 0) {
        return false
    }
    return map.queryRenderedFeatures([point.x, point.y], { layers }).length > 0
}

import MapLibreDraw from "@sphere/draw"
import type { Map as MaplibreMap } from "maplibre-gl"

// Draw renders every feature, vertex and midpoint from its own hot and cold sources, whatever the
// style preset names its layers
const DRAW_SOURCES: ReadonlySet<string> = new Set(Object.values(MapLibreDraw.constants.sources))

/** True when a feature of the draw control is rendered at the point (map pixels). */
export function isOverDrawFeature(
    map: Pick<MaplibreMap, "getStyle" | "queryRenderedFeatures">,
    point: { x: number; y: number },
): boolean {
    const layers = map
        .getStyle()
        .layers.flatMap(layer => ("source" in layer && DRAW_SOURCES.has(layer.source) ? [layer.id] : []))
    if (layers.length === 0) {
        return false
    }
    return map.queryRenderedFeatures([point.x, point.y], { layers }).length > 0
}

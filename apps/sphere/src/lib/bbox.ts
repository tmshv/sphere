import type { Bbox } from "@/types/bbox"
import type { Map as MaplibreMap } from "maplibre-gl"

export function bboxEqual(a: Bbox, b: Bbox): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}

export function screenToGeoBbox(
    map: MaplibreMap,
    start: { x: number; y: number },
    current: { x: number; y: number },
): Bbox {
    const containerRect = map.getContainer().getBoundingClientRect()
    const sw = map.unproject([
        Math.min(start.x, current.x) - containerRect.left,
        Math.max(start.y, current.y) - containerRect.top,
    ])
    const ne = map.unproject([
        Math.max(start.x, current.x) - containerRect.left,
        Math.min(start.y, current.y) - containerRect.top,
    ])
    return [sw.lng, sw.lat, ne.lng, ne.lat]
}

type BoundsLike = {
    getWest(): number
    getSouth(): number
    getEast(): number
    getNorth(): number
}

/** `[west, south, east, north]` of map bounds (e.g. `map.getBounds()`). */
export function boundsToBbox(bounds: BoundsLike): Bbox {
    return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

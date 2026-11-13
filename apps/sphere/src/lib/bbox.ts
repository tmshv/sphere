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

const WORLD_WIDTH = 360
const MIN_LNG = -180
const MAX_LNG = 180
const MAX_LAT = 90

function clampLat(lat: number): number {
    return Math.min(MAX_LAT, Math.max(-MAX_LAT, lat))
}

/**
 * `[west, south, east, north]` of map bounds (e.g. `map.getBounds()`) for a
 * plain backend rect query. MapLibre bounds are not wrapped: a view on a world
 * copy is shifted back so west is in [-180, 180), and a view that crosses the
 * antimeridian or spans the world takes the whole longitude range, so no
 * visible feature is left out (the working-set cap still applies). Latitude is
 * clamped to the poles.
 */
export function viewportBbox(bounds: BoundsLike): Bbox {
    const west = bounds.getWest()
    const east = bounds.getEast()
    const south = clampLat(bounds.getSouth())
    const north = clampLat(bounds.getNorth())
    const wholeWorld: Bbox = [MIN_LNG, south, MAX_LNG, north]
    if (east - west >= WORLD_WIDTH) {
        return wholeWorld
    }
    const shift = Math.floor((west - MIN_LNG) / WORLD_WIDTH) * WORLD_WIDTH
    const shiftedEast = east - shift
    if (shiftedEast > MAX_LNG) {
        return wholeWorld
    }
    return [west - shift, south, shiftedEast, north]
}

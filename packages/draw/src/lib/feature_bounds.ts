import type { AnyDrawGeometry } from "../types"

/** `[west, south, east, north]` */
export type Bounds = [number, number, number, number]

/** A position or arbitrarily nested arrays of positions. */
type NestedPositions = readonly number[] | readonly NestedPositions[]

function isPosition(coordinates: NestedPositions): coordinates is readonly number[] {
    return typeof coordinates.at(0) === "number"
}

function includePositions(bounds: Bounds, coordinates: NestedPositions): void {
    if (isPosition(coordinates)) {
        const [x = Number.NaN, y = Number.NaN] = coordinates
        bounds[0] = Math.min(bounds[0], x)
        bounds[1] = Math.min(bounds[1], y)
        bounds[2] = Math.max(bounds[2], x)
        bounds[3] = Math.max(bounds[3], y)
        return
    }
    for (const child of coordinates) {
        includePositions(bounds, child)
    }
}

/**
 * Returns the [west, south, east, north] bounds of a GeoJSON feature's
 * coordinates. A feature without coordinates gets inverted infinite bounds.
 */
export default function featureBounds(feature: { geometry: AnyDrawGeometry }): Bounds {
    const bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity]
    includePositions(bounds, feature.geometry.coordinates)
    return bounds
}

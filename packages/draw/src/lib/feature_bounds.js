function includePositions(bounds, coordinates) {
    if (typeof coordinates[0] === "number") {
        bounds[0] = Math.min(bounds[0], coordinates[0])
        bounds[1] = Math.min(bounds[1], coordinates[1])
        bounds[2] = Math.max(bounds[2], coordinates[0])
        bounds[3] = Math.max(bounds[3], coordinates[1])
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
export default function featureBounds(feature) {
    const bounds = [Infinity, Infinity, -Infinity, -Infinity]
    includePositions(bounds, feature.geometry.coordinates)
    return bounds
}

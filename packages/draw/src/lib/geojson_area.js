// WGS84 equatorial radius in meters
const EARTH_RADIUS = 6378137
const STRAIGHT_ANGLE_DEGREES = 180

function toRadians(degrees) {
    return (degrees * Math.PI) / STRAIGHT_ANGLE_DEGREES
}

/**
 * Approximate signed area of a ring projected onto the earth, in square
 * meters. Positive for clockwise rings.
 *
 * Robert G. Chamberlain and William H. Duquette, "Some Algorithms for Polygons
 * on a Sphere", JPL Publication 07-03, Jet Propulsion Laboratory, 2007.
 */
export function ringArea(ring) {
    const count = ring.length
    if (count <= 2) return 0

    let area = 0
    for (let i = 0; i < count; i++) {
        const lower = ring[i]
        const middle = ring[(i + 1) % count]
        const upper = ring[(i + 2) % count]
        area += (toRadians(upper[0]) - toRadians(lower[0])) * Math.sin(toRadians(middle[1]))
    }
    return (area * EARTH_RADIUS * EARTH_RADIUS) / 2
}

function polygonArea(rings) {
    let area = 0
    for (const [index, ring] of rings.entries()) {
        const ringSize = Math.abs(ringArea(ring))
        area += index === 0 ? ringSize : -ringSize
    }
    return area
}

/**
 * Approximate area of a GeoJSON geometry in square meters. Points and lines
 * have no area.
 */
export default function geometryArea(geometry) {
    if (geometry.type === "Polygon") return polygonArea(geometry.coordinates)
    if (geometry.type === "MultiPolygon") {
        return geometry.coordinates.reduce((sum, polygon) => sum + polygonArea(polygon), 0)
    }
    return 0
}

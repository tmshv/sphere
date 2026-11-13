const GEOMETRY_TYPES = new Set([
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection",
])

/**
 * Wraps a GeoJSON geometry or feature into a FeatureCollection. A
 * FeatureCollection is returned as is. Returns null for anything else.
 */
export default function normalize(geojson) {
    if (!geojson?.type) return null
    if (GEOMETRY_TYPES.has(geojson.type)) {
        return {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: geojson }],
        }
    }
    if (geojson.type === "Feature") {
        return { type: "FeatureCollection", features: [geojson] }
    }
    if (geojson.type === "FeatureCollection") {
        return geojson
    }
    return null
}

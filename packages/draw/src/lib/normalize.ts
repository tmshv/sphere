import type { FeatureCollection, GeoJSON, Geometry } from "geojson"
import type { FeatureProperties } from "../types"

/** GeoJSON Draw accepts: a geometry, a feature or a feature collection. */
export type DrawInput = GeoJSON<Geometry | null, FeatureProperties | null>

export type NormalizedCollection = FeatureCollection<Geometry | null, FeatureProperties | null>

const GEOMETRY_TYPES: ReadonlySet<string> = new Set([
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
export default function normalize(geojson: DrawInput | null | undefined): NormalizedCollection | null {
    if (!geojson?.type) return null
    if (geojson.type === "Feature") {
        return { type: "FeatureCollection", features: [geojson] }
    }
    if (geojson.type === "FeatureCollection") {
        return geojson
    }
    if (GEOMETRY_TYPES.has(geojson.type)) {
        return {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: geojson }],
        }
    }
    return null
}

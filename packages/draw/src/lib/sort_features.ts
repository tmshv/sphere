import type { Geometry } from "geojson"
import * as Constants from "../constants"
import geometryArea from "./geojson_area"

const FEATURE_SORT_RANKS: Partial<Record<Geometry["type"], number>> = {
    Point: 0,
    MultiPoint: 0,
    LineString: 1,
    MultiLineString: 1,
    Polygon: 2,
    MultiPolygon: 2,
}

const AREA_TYPES: ReadonlySet<string> = new Set([Constants.geojsonTypes.POLYGON, Constants.geojsonTypes.MULTI_POLYGON])

// Sort points first, then lines, then polygons; polygons by area ascending, so
// a small polygon on top of a large one is the one that gets picked.
// A geometry type without a rank (a GeometryCollection) sorts unpredictably.
function sortFeatures<F extends { geometry: Geometry }>(features: readonly F[]): F[] {
    const ranked = features.map(feature => ({
        feature,
        rank: FEATURE_SORT_RANKS[feature.geometry.type] ?? Number.NaN,
        area: AREA_TYPES.has(feature.geometry.type) ? geometryArea(feature.geometry) : 0,
    }))
    ranked.sort((a, b) => a.rank - b.rank || a.area - b.area)
    return ranked.map(({ feature }) => feature)
}

export default sortFeatures

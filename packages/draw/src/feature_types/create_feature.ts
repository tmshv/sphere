import * as Constants from "../constants"
import type { AnyDrawGeometry, DrawFeatureInput, GeometryKind } from "../types"
import type { DrawFeature } from "./draw_feature"
import type { FeatureContext } from "./feature"
import LineString from "./line_string"
import MultiFeature from "./multi_feature"
import Point from "./point"
import Polygon from "./polygon"

/** GeoJSON for any kind of Draw feature. */
export interface AnyFeatureInput extends Omit<DrawFeatureInput<GeometryKind>, "geometry"> {
    geometry: AnyDrawGeometry
}

const GEOMETRY_KINDS: ReadonlySet<string> = new Set<GeometryKind>([
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon",
])

/** Whether Draw has a feature class for the geometry type. */
export function isGeometryKind(type: string): type is GeometryKind {
    return GEOMETRY_KINDS.has(type)
}

/** Creates the Draw feature class matching the GeoJSON's geometry type. */
export default function createFeature(ctx: FeatureContext, geojson: AnyFeatureInput): DrawFeature {
    const geometry = geojson.geometry
    switch (geometry.type) {
        case Constants.geojsonTypes.POINT:
            return new Point(ctx, { ...geojson, geometry })
        case Constants.geojsonTypes.LINE_STRING:
            return new LineString(ctx, { ...geojson, geometry })
        case Constants.geojsonTypes.POLYGON:
            return new Polygon(ctx, { ...geojson, geometry })
        case Constants.geojsonTypes.MULTI_POINT:
            return new MultiFeature(ctx, { ...geojson, geometry })
        case Constants.geojsonTypes.MULTI_LINE_STRING:
            return new MultiFeature(ctx, { ...geojson, geometry })
        case Constants.geojsonTypes.MULTI_POLYGON:
            return new MultiFeature(ctx, { ...geojson, geometry })
    }
    // Plain JavaScript callers can pass any geometry type
    throw new TypeError(`${geojson.geometry.type} is not a valid type`)
}

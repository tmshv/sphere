import type LineString from "./line_string"
import type MultiFeature from "./multi_feature"
import type Point from "./point"
import type Polygon from "./polygon"

/** Any Draw feature, discriminated by `type`. */
export type DrawFeature =
    | Point
    | LineString
    | Polygon
    | MultiFeature<"MultiPoint">
    | MultiFeature<"MultiLineString">
    | MultiFeature<"MultiPolygon">

/**
 * Returns the feature, or throws a `TypeError` for a missing one, as reading
 * from `undefined` would.
 */
export function requireFeature(feature: DrawFeature | undefined): DrawFeature {
    if (feature === undefined) throw new TypeError("Cannot use an undefined feature")
    return feature
}

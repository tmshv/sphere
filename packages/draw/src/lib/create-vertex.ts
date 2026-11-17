import type { Position } from "geojson"
import * as Constants from "../constants"
import type { DrawGeometry, DrawRenderFeature, FeatureId } from "../types"

/**
 * Returns GeoJSON for a Point representing the
 * vertex of another feature.
 *
 * @param parentId
 * @param coordinates
 * @param path - Dot-separated numbers indicating exactly
 *   where the point exists within its parent feature's coordinates.
 * @param selected
 * @return GeoJSON Point
 */
export default function createVertex(
    parentId: FeatureId | undefined,
    coordinates: Position,
    path: string | null,
    selected: boolean,
): DrawRenderFeature<DrawGeometry<"Point">> {
    return {
        type: Constants.geojsonTypes.FEATURE,
        properties: {
            meta: Constants.meta.VERTEX,
            parent: parentId,
            coord_path: path,
            active: selected ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE,
        },
        geometry: {
            type: Constants.geojsonTypes.POINT,
            coordinates,
        },
    }
}

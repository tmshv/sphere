import * as Constants from "../constants"
import type { DrawGeometry, DrawRenderFeature, FeatureId } from "../types"

type PointRenderFeature = DrawRenderFeature<DrawGeometry<"Point">>

export default function createMidpoint(
    parent: FeatureId | undefined,
    startVertex: PointRenderFeature,
    endVertex: PointRenderFeature,
): PointRenderFeature | null {
    const [startLng = Number.NaN, startLat = Number.NaN] = startVertex.geometry.coordinates
    const [endLng = Number.NaN, endLat = Number.NaN] = endVertex.geometry.coordinates

    // If a coordinate exceeds the projection, we can't calculate a midpoint,
    // so run away
    if (
        startLat > Constants.LAT_RENDERED_MAX ||
        startLat < Constants.LAT_RENDERED_MIN ||
        endLat > Constants.LAT_RENDERED_MAX ||
        endLat < Constants.LAT_RENDERED_MIN
    ) {
        return null
    }

    const mid = {
        lng: (startLng + endLng) / 2,
        lat: (startLat + endLat) / 2,
    }

    return {
        type: Constants.geojsonTypes.FEATURE,
        properties: {
            meta: Constants.meta.MIDPOINT,
            parent,
            lng: mid.lng,
            lat: mid.lat,
            coord_path: endVertex.properties.coord_path,
        },
        geometry: {
            type: Constants.geojsonTypes.POINT,
            coordinates: [mid.lng, mid.lat],
        },
    }
}

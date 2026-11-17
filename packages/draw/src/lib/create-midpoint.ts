import * as Constants from "../constants"
import type { DrawGeometry, DrawRenderFeature, FeatureId } from "../types"

type PointRenderFeature = DrawRenderFeature<DrawGeometry<"Point">>

const DEGREES_PER_RADIAN = 180 / Math.PI
const QUARTER_TURN = Math.PI / 4

// Web Mercator y of a latitude (the unit does not matter, only its linearity on screen)
function mercatorY(lat: number): number {
    return Math.log(Math.tan(QUARTER_TURN + lat / DEGREES_PER_RADIAN / 2))
}

function mercatorLat(y: number): number {
    return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * DEGREES_PER_RADIAN
}

// A horizontal edge keeps its latitude exactly, without the round trip's float drift
function midLat(startLat: number, endLat: number): number {
    if (startLat === endLat) return startLat
    return mercatorLat((mercatorY(startLat) + mercatorY(endLat)) / 2)
}

/**
 * The midpoint of an edge as the map draws it: a straight segment in Web
 * Mercator, so the latitude is averaged in Mercator y, not in degrees.
 */
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
        lat: midLat(startLat, endLat),
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

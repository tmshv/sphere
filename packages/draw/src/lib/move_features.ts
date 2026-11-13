import type { Position } from "geojson"
import constrainFeatureMovement from "./constrain_feature_movement"
import * as Constants from "../constants"
import type { DrawFeature } from "../feature_types/draw_feature"
import type { LngLatValue } from "../types"

export default function moveFeatures(features: readonly DrawFeature[], delta: LngLatValue): void {
    const constrainedDelta = constrainFeatureMovement(
        features.map(feature => feature.toGeoJSON()),
        delta,
    )

    const moveCoordinate = (coord: Position): Position => {
        const [lng = Number.NaN, lat = Number.NaN] = coord
        const point = {
            lng: lng + constrainedDelta.lng,
            lat: lat + constrainedDelta.lat,
        }
        return [point.lng, point.lat]
    }
    const moveRing = (ring: Position[]) => ring.map(coord => moveCoordinate(coord))
    const moveMultiPolygon = (multi: Position[][]) => multi.map(ring => moveRing(ring))

    for (const feature of features) {
        switch (feature.type) {
            case Constants.geojsonTypes.POINT:
                feature.incomingCoords(moveCoordinate(feature.getCoordinates()))
                break
            case Constants.geojsonTypes.LINE_STRING:
            case Constants.geojsonTypes.MULTI_POINT:
                feature.incomingCoords(feature.getCoordinates().map(moveCoordinate))
                break
            case Constants.geojsonTypes.POLYGON:
            case Constants.geojsonTypes.MULTI_LINE_STRING:
                feature.incomingCoords(feature.getCoordinates().map(moveRing))
                break
            case Constants.geojsonTypes.MULTI_POLYGON:
                feature.incomingCoords(feature.getCoordinates().map(moveMultiPolygon))
                break
        }
    }
}

import featureBounds from "./feature_bounds"
import * as Constants from "../constants"
import type { AnyDrawGeometry, LngLatValue } from "../types"

const { LAT_MIN, LAT_MAX, LAT_RENDERED_MIN, LAT_RENDERED_MAX, LNG_MIN, LNG_MAX } = Constants

const FULL_TURN_DEGREES = 360

// Ensure that we do not drag north-south far enough for
// - any part of any feature to exceed the poles
// - any feature to be completely lost in the space between the projection's
//   edge and the poles, such that it couldn't be re-selected and moved back
// The returned delta is `delta` itself, adjusted in place.
export default function constrainFeatureMovement(
    geojsonFeatures: readonly { geometry: AnyDrawGeometry }[],
    delta: LngLatValue,
): LngLatValue {
    // "inner edge" = a feature's latitude closest to the equator
    let northInnerEdge: number = LAT_MIN
    let southInnerEdge: number = LAT_MAX
    // "outer edge" = a feature's latitude furthest from the equator
    let northOuterEdge: number = LAT_MIN
    let southOuterEdge: number = LAT_MAX

    let westEdge: number = LNG_MAX
    let eastEdge: number = LNG_MIN

    for (const feature of geojsonFeatures) {
        const [featureWestEdge, featureSouthEdge, featureEastEdge, featureNorthEdge] = featureBounds(feature)
        if (featureSouthEdge > northInnerEdge) northInnerEdge = featureSouthEdge
        if (featureNorthEdge < southInnerEdge) southInnerEdge = featureNorthEdge
        if (featureNorthEdge > northOuterEdge) northOuterEdge = featureNorthEdge
        if (featureSouthEdge < southOuterEdge) southOuterEdge = featureSouthEdge
        if (featureWestEdge < westEdge) westEdge = featureWestEdge
        if (featureEastEdge > eastEdge) eastEdge = featureEastEdge
    }

    // These changes are not mutually exclusive: we might hit the inner
    // edge but also have hit the outer edge and therefore need
    // another readjustment
    const constrainedDelta = delta
    if (northInnerEdge + constrainedDelta.lat > LAT_RENDERED_MAX) {
        constrainedDelta.lat = LAT_RENDERED_MAX - northInnerEdge
    }
    if (northOuterEdge + constrainedDelta.lat > LAT_MAX) {
        constrainedDelta.lat = LAT_MAX - northOuterEdge
    }
    if (southInnerEdge + constrainedDelta.lat < LAT_RENDERED_MIN) {
        constrainedDelta.lat = LAT_RENDERED_MIN - southInnerEdge
    }
    if (southOuterEdge + constrainedDelta.lat < LAT_MIN) {
        constrainedDelta.lat = LAT_MIN - southOuterEdge
    }
    if (westEdge + constrainedDelta.lng <= LNG_MIN) {
        constrainedDelta.lng += Math.ceil(Math.abs(constrainedDelta.lng) / FULL_TURN_DEGREES) * FULL_TURN_DEGREES
    }
    if (eastEdge + constrainedDelta.lng >= LNG_MAX) {
        constrainedDelta.lng -= Math.ceil(Math.abs(constrainedDelta.lng) / FULL_TURN_DEGREES) * FULL_TURN_DEGREES
    }

    return constrainedDelta
}

import sortFeatures from "./sort_features"
import mapEventToBoundingBox, { type ScreenBox } from "./map_event_to_bounding_box"
import * as Constants from "../constants"
import StringSet from "./string_set"
import type { DrawFeatureTarget, ScreenPoint } from "../types"

const META_TYPES: readonly string[] = [Constants.meta.FEATURE, Constants.meta.MIDPOINT, Constants.meta.VERTEX]

/** What a feature lookup needs from the Draw context. A context that is not attached to a map finds nothing. */
export interface FeaturesAtContext {
    readonly attached?: boolean
    readonly map: {
        queryRenderedFeatures(geometry: ScreenBox | undefined, options: { layers?: string[] }): DrawFeatureTarget[]
    }
    readonly options: {
        clickBuffer: number
        touchBuffer: number
        styles?: readonly { id: string }[]
    }
}

// Requires either event or bbox
export default {
    click: featuresAtClick,
    touch: featuresAtTouch,
}

function featuresAtClick(
    event: { point: ScreenPoint } | null,
    bbox: ScreenBox | null,
    ctx: FeaturesAtContext,
): DrawFeatureTarget[] {
    return featuresAt(event, bbox, ctx, ctx.options.clickBuffer)
}

function featuresAtTouch(
    event: { point: ScreenPoint } | null,
    bbox: ScreenBox | null,
    ctx: FeaturesAtContext,
): DrawFeatureTarget[] {
    return featuresAt(event, bbox, ctx, ctx.options.touchBuffer)
}

function featuresAt(
    event: { point: ScreenPoint } | null,
    bbox: ScreenBox | null,
    ctx: FeaturesAtContext,
    buffer: number,
): DrawFeatureTarget[] {
    if (ctx.attached === false) return []

    // Without an event or a bbox, MapLibre queries the whole viewport
    const box = (event ? mapEventToBoundingBox(event, buffer) : bbox) ?? undefined

    const queryParams: { layers?: string[] } = {}
    if (ctx.options.styles) queryParams.layers = ctx.options.styles.map(s => s.id)

    const features = ctx.map
        .queryRenderedFeatures(box, queryParams)
        .filter(feature => META_TYPES.some(type => type === feature.properties.meta))

    const featureIds = new StringSet()
    const uniqueFeatures: DrawFeatureTarget[] = []
    for (const feature of features) {
        const featureId = feature.properties.id
        if (featureId !== undefined) {
            if (featureIds.has(featureId)) continue
            featureIds.add(featureId)
        }
        uniqueFeatures.push(feature)
    }

    return sortFeatures(uniqueFeatures)
}

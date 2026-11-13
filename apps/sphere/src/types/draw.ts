import type { Bbox } from "./bbox"

export type DrawEvent = {
    features?: GeoJSON.Feature[]
    createdFeatures?: GeoJSON.Feature[]
    deletedFeatures?: GeoJSON.Feature[]
    type: string
}

/** A backend feature id (number) or a draw id created earlier in the session (string). */
export type DrawFeatureId = number | string

export type EditOp =
    | { type: "create"; drawId: string; feature: GeoJSON.Feature }
    | { type: "update"; id: DrawFeatureId; feature: GeoJSON.Feature }
    | { type: "delete"; id: DrawFeatureId }

export type WorkingSetScope = { type: "ids"; ids: number[] } | { type: "bbox"; bbox: Bbox }

export type WorkingSet = {
    features: GeoJSON.FeatureCollection
    overCap: boolean
}

export type FlushResult = { ok: true } | { ok: false; error: unknown; dropped: number }

/** How to bring draw in line with a fresh working set, and the loaded ids after it. */
export type WorkingSetPlan = {
    add: GeoJSON.Feature[]
    unload: DrawFeatureId[]
    loaded: Set<DrawFeatureId>
}

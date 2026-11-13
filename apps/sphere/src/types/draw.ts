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

export type WorkingSetScope = { type: "ids"; ids: number[] } | { type: "bbox"; bbox: [number, number, number, number] }

export type WorkingSet = {
    features: GeoJSON.FeatureCollection
    overCap: boolean
}

export type FlushResult = { ok: true } | { ok: false; error: unknown; dropped: number }

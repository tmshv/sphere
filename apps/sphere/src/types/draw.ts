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
    // A feature may come back without a geometry
    features: GeoJSON.FeatureCollection<GeoJSON.Geometry | null>
    overCap: boolean
}

export type FlushResult = { ok: true } | { ok: false; error: unknown; dropped: number }

/** How to bring draw in line with a fresh working set, and the loaded ids after it. */
export type WorkingSetPlan = {
    add: GeoJSON.Feature[]
    unload: DrawFeatureId[]
    loaded: Set<DrawFeatureId>
}

/** A draw tool of the app toolbar: each starts the draw control's mode that creates that kind of feature. */
export type DrawTool = "point" | "line" | "polygon"

/** A press on the app's draw toolbar. */
export type DrawToolbarAction = DrawTool | "trash" | "combine" | "uncombine"

/** Which of draw's actions apply to its current mode and selection, as `draw.actionable` reports it. */
export type DrawActionable = {
    trash: boolean
    combineFeatures: boolean
    uncombineFeatures: boolean
}

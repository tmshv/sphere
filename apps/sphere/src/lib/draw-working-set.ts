import type { DrawEvent, DrawFeatureId, WorkingSetPlan, WorkingSetScope } from "@/types"
import type { Bbox } from "@/types/bbox"

export type ChooseWorkingSetScopeInput = {
    sourceId: string
    // The source the frontend selection belongs to
    selectionSourceId: string | undefined
    // The backend selection
    selectionIds: number[]
    // The viewport
    bbox: Bbox
}

/** The selection when it belongs to the drawn source and is not empty, else the viewport. */
export function chooseWorkingSetScope({
    sourceId,
    selectionSourceId,
    selectionIds,
    bbox,
}: ChooseWorkingSetScopeInput): WorkingSetScope {
    if (selectionSourceId === sourceId && selectionIds.length > 0) {
        return { type: "ids", ids: selectionIds }
    }
    return { type: "bbox", bbox }
}

/**
 * The scope to re-query after the map moved: a viewport scope follows the map, a
 * selection scope stays as loaded (undefined: nothing to re-query).
 */
export function scopeAfterMove(scope: WorkingSetScope | undefined, bbox: Bbox): WorkingSetScope | undefined {
    if (scope?.type !== "bbox") {
        return undefined
    }
    return { type: "bbox", bbox }
}

/** Ids of the features a draw edit event touched: edited, deleted or created. */
export function touchedIds(event: DrawEvent): DrawFeatureId[] {
    const features = [...(event.features ?? []), ...(event.deletedFeatures ?? []), ...(event.createdFeatures ?? [])]
    return features.flatMap(featureIds)
}

export type PlanWorkingSetUpdateInput = {
    // Ids loaded into draw from the backend so far
    loaded: ReadonlySet<DrawFeatureId>
    // Ids edited, deleted or created in this session (created ones under both their draw and backend ids)
    pinned: ReadonlySet<DrawFeatureId>
    // The fresh working set from the backend
    incoming: GeoJSON.Feature[]
}

/**
 * How to bring draw in line with a fresh working set. A pinned feature is never
 * loaded (draw holds the edited version, and the backend copy may lag behind
 * queued ops) and never unloaded. Untouched features that are no longer in the
 * working set are unloaded, so draw only holds what is in view plus the edits.
 * An incoming feature without an id cannot be mapped back to the backend and is
 * skipped.
 */
export function planWorkingSetUpdate({ loaded, pinned, incoming }: PlanWorkingSetUpdateInput): WorkingSetPlan {
    const incomingIds = new Set<DrawFeatureId>()
    const add: GeoJSON.Feature[] = []
    for (const feature of incoming) {
        const id = feature.id
        if (id === undefined) {
            continue
        }
        incomingIds.add(id)
        if (!loaded.has(id) && !pinned.has(id)) {
            add.push(feature)
        }
    }
    const unload = [...loaded].filter(id => !pinned.has(id) && !incomingIds.has(id))
    const kept = [...loaded].filter(id => pinned.has(id) || incomingIds.has(id))
    return { add, unload, loaded: new Set([...kept, ...add.flatMap(featureIds)]) }
}

function featureIds(feature: GeoJSON.Feature): DrawFeatureId[] {
    return feature.id === undefined ? [] : [feature.id]
}

import type { DrawEvent, DrawFeatureId, WorkingSetPlan } from "@/types"

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
    // Ids another part of the working set still holds: kept loaded, though not incoming
    keep: ReadonlySet<DrawFeatureId>
    // The fresh features of the part of the working set just queried
    incoming: GeoJSON.Feature<GeoJSON.Geometry | null>[]
}

/**
 * How to bring draw in line with a freshly queried part of the working set. A
 * pinned feature is never loaded (draw holds the edited version, and the backend
 * copy may lag behind queued ops) and never unloaded. Untouched features that are
 * neither incoming nor kept are unloaded, so draw only holds the working set.
 * An incoming feature without an id cannot be mapped back to the backend, and
 * draw cannot hold one with no geometry or a GeometryCollection (it would throw
 * partway through the load); both are skipped and stay as they are.
 */
export function planWorkingSetUpdate({ loaded, pinned, keep, incoming }: PlanWorkingSetUpdateInput): WorkingSetPlan {
    const incomingIds = new Set<DrawFeatureId>()
    const add: GeoJSON.Feature[] = []
    for (const feature of incoming) {
        const id = feature.id
        if (id === undefined || !isDrawable(feature)) {
            continue
        }
        incomingIds.add(id)
        if (!loaded.has(id) && !pinned.has(id)) {
            add.push(feature)
        }
    }
    const stays = (id: DrawFeatureId) => pinned.has(id) || keep.has(id) || incomingIds.has(id)
    const unload = [...loaded].filter(id => !stays(id))
    const kept = [...loaded].filter(stays)
    return { add, unload, loaded: new Set([...kept, ...add.flatMap(featureIds)]) }
}

function featureIds(feature: GeoJSON.Feature): DrawFeatureId[] {
    return feature.id === undefined ? [] : [feature.id]
}

const GEOMETRY_COLLECTION = "GeometryCollection"

function isDrawable(feature: GeoJSON.Feature<GeoJSON.Geometry | null>): feature is GeoJSON.Feature {
    return feature.geometry !== null && feature.geometry.type !== GEOMETRY_COLLECTION
}

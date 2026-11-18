import type { DrawFeatureId } from "@/types"
import type { SelectionDelta } from "./selection-ipc"

/**
 * The draw ids to select in draw for the backend selection `selected`: each
 * feature draw holds whose backend id is selected (a created feature keeps its
 * string draw id; one whose create has not settled has no backend id yet).
 * Only the held features are looked up, so the cost follows the working set,
 * not the selection, which may be far larger.
 */
export function drawSelectionIds(
    selected: ReadonlySet<number>,
    held: Iterable<DrawFeatureId>,
    toBackendId: (id: DrawFeatureId) => number | undefined,
): DrawFeatureId[] {
    const ids: DrawFeatureId[] = []
    for (const id of held) {
        const backend = toBackendId(id)
        if (backend !== undefined && selected.has(backend)) {
            ids.push(id)
        }
    }
    return ids
}

/** Applies a backend selection delta to the mirrored selection in place. */
export function applyDelta(selected: Set<number>, delta: SelectionDelta): void {
    for (const id of delta.removed) {
        selected.delete(id)
    }
    for (const id of delta.added) {
        selected.add(id)
    }
}

/** The ids of draw features, skipping any without one. */
export function featureIds(features: readonly { id?: DrawFeatureId }[]): DrawFeatureId[] {
    return features.flatMap(feature => (feature.id === undefined ? [] : [feature.id]))
}

/** True when both lists hold the same ids, in any order. */
export function sameIds(a: readonly DrawFeatureId[], b: readonly DrawFeatureId[]): boolean {
    const set = new Set(a)
    return set.size === new Set(b).size && b.every(id => set.has(id))
}

/** Backend ids of draw features; a created feature whose create has not settled has none and is skipped. */
export function toBackendIds(
    ids: readonly DrawFeatureId[],
    backendId: (id: DrawFeatureId) => number | undefined,
): number[] {
    return ids.flatMap(id => {
        const backend = backendId(id)
        return backend === undefined ? [] : [backend]
    })
}

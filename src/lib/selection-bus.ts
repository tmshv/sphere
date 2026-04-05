import type { SelectionDelta } from "./selection-ipc"

type DeltaListener = (delta: SelectionDelta) => void
type ReconcilePayload = { ids: number[]; sourceId: string }
type ReconcileListener = (payload: ReconcilePayload) => void

let deltaListener: DeltaListener | null = null
let reconcileListener: ReconcileListener | null = null

export function onSelectionDelta(fn: DeltaListener): () => void {
    deltaListener = fn
    return () => {
        if (deltaListener === fn) {
            deltaListener = null
        }
    }
}

export function emitSelectionDelta(delta: SelectionDelta): void {
    deltaListener?.(delta)
}

export function onSelectionReconcile(fn: ReconcileListener): () => void {
    reconcileListener = fn
    return () => {
        if (reconcileListener === fn) {
            reconcileListener = null
        }
    }
}

export function emitSelectionReconcile(ids: number[], sourceId: string): void {
    reconcileListener?.({ ids, sourceId })
}

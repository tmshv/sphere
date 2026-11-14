import type { SelectionDelta } from "./selection-ipc"

type DeltaListener = (delta: SelectionDelta) => void
type ReconcilePayload = { ids: number[]; sourceId: string }
type ReconcileListener = (payload: ReconcilePayload) => void

const deltaListeners = new Set<DeltaListener>()
const reconcileListeners = new Set<ReconcileListener>()

export function onSelectionDelta(fn: DeltaListener): () => void {
    // A wrapper keeps the same function subscribed twice as two independent subscriptions
    const entry: DeltaListener = delta => fn(delta)
    deltaListeners.add(entry)
    return () => {
        deltaListeners.delete(entry)
    }
}

export function emitSelectionDelta(delta: SelectionDelta): void {
    for (const fn of [...deltaListeners]) {
        fn(delta)
    }
}

export function onSelectionReconcile(fn: ReconcileListener): () => void {
    const entry: ReconcileListener = payload => fn(payload)
    reconcileListeners.add(entry)
    return () => {
        reconcileListeners.delete(entry)
    }
}

export function emitSelectionReconcile(ids: number[], sourceId: string): void {
    for (const fn of [...reconcileListeners]) {
        fn({ ids, sourceId })
    }
}

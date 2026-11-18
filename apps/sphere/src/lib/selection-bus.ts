import type { SelectionDelta } from "./selection-ipc"

/**
 * How a delta came about. `dragging` marks one step of a rectangle still being
 * dragged: the drag's end always emits the settled selection after it, so a
 * listener with costly work (loading features) may wait for that.
 */
export type DeltaOrigin = { dragging: boolean }

type DeltaListener = (delta: SelectionDelta, origin: DeltaOrigin) => void
type ReconcilePayload = { ids: number[]; sourceId: string }
type ReconcileListener = (payload: ReconcilePayload) => void

const deltaListeners = new Set<DeltaListener>()
const reconcileListeners = new Set<ReconcileListener>()

export function onSelectionDelta(fn: DeltaListener): () => void {
    // A wrapper keeps the same function subscribed twice as two independent subscriptions
    const entry: DeltaListener = (delta, origin) => fn(delta, origin)
    deltaListeners.add(entry)
    return () => {
        deltaListeners.delete(entry)
    }
}

const SETTLED: DeltaOrigin = { dragging: false }

export function emitSelectionDelta(delta: SelectionDelta, origin: DeltaOrigin = SETTLED): void {
    for (const fn of [...deltaListeners]) {
        fn(delta, origin)
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

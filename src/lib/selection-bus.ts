import type { SelectionDelta } from "./selection-ipc"

type DeltaListener = (delta: SelectionDelta) => void

let listener: DeltaListener | null = null

export function onSelectionDelta(fn: DeltaListener): () => void {
    listener = fn
    return () => {
        if (listener === fn) {
            listener = null
        }
    }
}

export function emitSelectionDelta(delta: SelectionDelta): void {
    listener?.(delta)
}

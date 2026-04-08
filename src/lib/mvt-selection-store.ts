import type { FeatureCollection } from "geojson"

type SelectionListener = (fc: FeatureCollection) => void

const emptyFc = (): FeatureCollection => ({ type: "FeatureCollection", features: [] })

let current: FeatureCollection = emptyFc()
let listener: SelectionListener | null = null

export function getMvtSelection(): FeatureCollection {
    return current
}

export function setMvtSelection(fc: FeatureCollection): void {
    current = fc
    listener?.(current)
}

export function clearMvtSelection(): void {
    current = emptyFc()
    listener?.(current)
}

export function onMvtSelectionUpdate(fn: SelectionListener): () => void {
    listener = fn
    return () => {
        if (listener === fn) {
            listener = null
        }
    }
}

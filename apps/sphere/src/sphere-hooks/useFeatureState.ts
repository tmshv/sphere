import { type RootState, selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { onSelectionDelta, onSelectionReconcile } from "@/lib/selection-bus"
import { useEffect, useRef } from "react"
import { useStore } from "react-redux"
import type { Map as MaplibreMap } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"
import { SourceType } from "@/types"

function setIdsSelected(map: MaplibreMap, sourceId: string, sourceLayers: string[], ids: number[]): void {
    if (sourceLayers.length > 0) {
        for (const sl of sourceLayers) {
            for (const id of ids) {
                try {
                    map.setFeatureState({ source: sourceId, sourceLayer: sl, id }, { selected: true })
                } catch {
                    // source may not exist on map yet
                }
            }
        }
    } else {
        for (const id of ids) {
            try {
                map.setFeatureState({ source: sourceId, id }, { selected: true })
            } catch {
                // source may not exist on map yet
            }
        }
    }
}

function removeIdsSelected(map: MaplibreMap, sourceId: string, sourceLayers: string[], ids: number[]): void {
    if (sourceLayers.length > 0) {
        for (const sl of sourceLayers) {
            for (const id of ids) {
                try {
                    map.removeFeatureState({ source: sourceId, sourceLayer: sl, id })
                } catch {
                    // source may not exist on map yet
                }
            }
        }
    } else {
        for (const id of ids) {
            try {
                map.removeFeatureState({ source: sourceId, id })
            } catch {
                // source may not exist on map yet
            }
        }
    }
}

function clearAllState(map: MaplibreMap, sourceId: string, sourceLayers: string[]): void {
    if (sourceLayers.length > 0) {
        for (const sl of sourceLayers) {
            try {
                map.removeFeatureState({ source: sourceId, sourceLayer: sl })
            } catch {
                // source may not exist on map yet
            }
        }
    } else {
        try {
            map.removeFeatureState({ source: sourceId })
        } catch {
            // source may not exist on map yet
        }
    }
}

function isSameTarget(
    prevSourceId: string,
    prevSourceLayers: string[],
    sourceId: string | undefined,
    sourceLayers: string[],
): boolean {
    if (prevSourceId !== sourceId) return false
    if (prevSourceLayers.length !== sourceLayers.length) return false
    return prevSourceLayers.every((sl, i) => sl === sourceLayers.at(i))
}

/** What the highlighted target is resolved from. */
type TargetInputs = {
    drawing: boolean
    layerSelectedId: string | undefined
    selectedSourceId: string | undefined
    selectedSourceLayer: string | undefined
    layerItems: RootState["layer"]["items"]
    sourceItems: RootState["source"]["items"]
}

/** The MapLibre source (and MVT source-layers) whose features carry the selection highlights. */
type Target = { sourceId: string | undefined; sourceLayers: string[] }

function targetInputs(state: RootState): TargetInputs {
    return {
        drawing: selectors.selection.drawing(state),
        layerSelectedId: selectors.layer.selectSelectedId(state),
        selectedSourceId: selectors.selection.targetSourceId(state),
        selectedSourceLayer: selectors.source.selectSelectedSourceLayer(state),
        layerItems: state.layer.items,
        sourceItems: state.source.items,
    }
}

function resolveTarget(inputs: TargetInputs, map: MaplibreMap | undefined): Target {
    // While drawing, highlights go to the drawn source whatever layer is selected
    const selectedLayerId = inputs.drawing ? undefined : inputs.layerSelectedId
    let sourceId: string | undefined
    if (selectedLayerId) {
        const fromStore = inputs.layerItems[selectedLayerId]?.sourceId
        if (fromStore) {
            sourceId = fromStore
        } else {
            const mapLayer = map?.getLayer(selectedLayerId)
            sourceId = (mapLayer as { source?: string } | undefined)?.source
        }
    } else {
        sourceId = inputs.selectedSourceId
    }

    // Track source-layers for MVT sources
    let sourceLayers: string[] = []
    const src = sourceId ? inputs.sourceItems[sourceId] : undefined
    if (src?.type === SourceType.MVT && "sourceLayers" in src) {
        // A source-layer node narrows highlighting to its own layer; Layers-tab selection keeps all
        const narrowedTo = selectedLayerId ? undefined : inputs.selectedSourceLayer
        sourceLayers = narrowedTo !== undefined ? [narrowedTo] : src.sourceLayers.map(sl => sl.id)
    }
    return { sourceId, sourceLayers }
}

export default function useFeatureState(ref: MapRef | undefined) {
    const store = useStore<RootState>()
    const drawing = useAppSelector(selectors.selection.drawing)
    const layerSelectedId = useAppSelector(selectors.layer.selectSelectedId)
    const selectedSourceId = useAppSelector(selectors.selection.targetSourceId)
    const selectedSourceLayer = useAppSelector(selectors.source.selectSelectedSourceLayer)
    const layerItems = useAppSelector(state => state.layer.items)
    const sourceItems = useAppSelector(state => state.source.items)

    // The target the highlights were last put on, so they can be cleared when it changes
    const sourceIdRef = useRef<string | undefined>(undefined)
    const sourceLayersRef = useRef<string[]>([])

    useEffect(() => {
        const map = ref?.getMap()
        const { sourceId, sourceLayers } = resolveTarget(
            { drawing, layerSelectedId, selectedSourceId, selectedSourceLayer, layerItems, sourceItems },
            map,
        )

        // The selection reset that follows a node change lands after the refs moved on,
        // so the previous target's highlights are cleared here instead
        const prevSourceId = sourceIdRef.current
        const prevSourceLayers = sourceLayersRef.current
        if (map && prevSourceId && !isSameTarget(prevSourceId, prevSourceLayers, sourceId, sourceLayers)) {
            clearAllState(map, prevSourceId, prevSourceLayers)
        }

        sourceIdRef.current = sourceId
        sourceLayersRef.current = sourceLayers
    }, [drawing, layerSelectedId, layerItems, selectedSourceId, selectedSourceLayer, sourceItems, ref])

    // Subscribe to delta + reconcile buses and drive MapLibre feature state. The target is read
    // from the store when an event lands, not from the refs: an event may follow a target change
    // (a draw session ending, say) before React has rendered it
    useEffect(() => {
        const currentTarget = (map: MaplibreMap) => resolveTarget(targetInputs(store.getState()), map)

        const unsubDelta = onSelectionDelta(delta => {
            const map = ref?.getMap()
            if (!map) return
            const { sourceId, sourceLayers } = currentTarget(map)
            if (!sourceId) return
            removeIdsSelected(map, sourceId, sourceLayers, delta.removed)
            setIdsSelected(map, sourceId, sourceLayers, delta.added)
        })

        const unsubReconcile = onSelectionReconcile(({ ids, sourceId }) => {
            const map = ref?.getMap()
            if (!map) return
            const target = currentTarget(map)
            if (!target.sourceId || target.sourceId !== sourceId) return
            clearAllState(map, target.sourceId, target.sourceLayers)
            setIdsSelected(map, target.sourceId, target.sourceLayers, ids)
        })

        return () => {
            unsubDelta()
            unsubReconcile()
        }
    }, [ref, store])
}

import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { onSelectionDelta, onSelectionReconcile } from "@/lib/selection-bus"
import { useEffect, useRef } from "react"
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

export default function useFeatureState(ref: MapRef | undefined) {
    const selectedLayerId = useAppSelector(selectors.layer.selectSelectedId)
    const selectedSourceId = useAppSelector(selectors.source.selectSelectedId)
    const layerItems = useAppSelector(state => state.layer.items)
    const sourceItems = useAppSelector(state => state.source.items)

    const sourceIdRef = useRef<string | undefined>()
    const sourceLayersRef = useRef<string[]>([])

    // Keep sourceId and sourceLayers refs in sync
    useEffect(() => {
        if (selectedLayerId) {
            const fromStore = layerItems[selectedLayerId]?.sourceId
            if (fromStore) {
                sourceIdRef.current = fromStore
            } else {
                const mapLayer = ref?.getMap()?.getLayer(selectedLayerId)
                sourceIdRef.current = (mapLayer as { source?: string } | undefined)?.source
            }
        } else {
            sourceIdRef.current = selectedSourceId
        }

        // Track source-layers for MVT sources
        const sid = sourceIdRef.current
        if (sid) {
            const src = sourceItems[sid]
            if (src?.type === SourceType.MVT && "sourceLayers" in src) {
                sourceLayersRef.current = src.sourceLayers.map(sl => sl.id)
                return
            }
        }
        sourceLayersRef.current = []
    }, [selectedLayerId, layerItems, selectedSourceId, sourceItems, ref])

    // Subscribe to delta + reconcile buses and drive MapLibre feature state
    useEffect(() => {
        const unsubDelta = onSelectionDelta(delta => {
            const map = ref?.getMap()
            const sourceId = sourceIdRef.current
            if (!map || !sourceId) return
            const sourceLayers = sourceLayersRef.current
            removeIdsSelected(map, sourceId, sourceLayers, delta.removed)
            setIdsSelected(map, sourceId, sourceLayers, delta.added)
        })

        const unsubReconcile = onSelectionReconcile(({ ids, sourceId }) => {
            const map = ref?.getMap()
            const currentSourceId = sourceIdRef.current
            if (!map || !currentSourceId) return
            if (currentSourceId !== sourceId) return
            const sourceLayers = sourceLayersRef.current
            clearAllState(map, currentSourceId, sourceLayers)
            setIdsSelected(map, currentSourceId, sourceLayers, ids)
        })

        return () => {
            unsubDelta()
            unsubReconcile()
        }
    }, [ref])
}

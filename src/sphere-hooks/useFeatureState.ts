import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { onSelectionDelta, onSelectionReconcile } from "@/lib/selection-bus"
import { useEffect, useRef } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { SourceType } from "@/types"

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

    // Subscribe to delta bus and apply incremental feature-state changes
    useEffect(() => {
        const unsubscribe = onSelectionDelta(delta => {
            const map = ref?.getMap()
            const sourceId = sourceIdRef.current
            if (!map || !sourceId) return

            const sourceLayers = sourceLayersRef.current
            const isVector = sourceLayers.length > 0

            for (const id of delta.removed) {
                try {
                    if (isVector) {
                        for (const sl of sourceLayers) {
                            map.removeFeatureState({ source: sourceId, sourceLayer: sl, id })
                        }
                    } else {
                        map.removeFeatureState({ source: sourceId, id })
                    }
                } catch {
                    // source may not exist on map yet
                }
            }
            for (const id of delta.added) {
                try {
                    if (isVector) {
                        for (const sl of sourceLayers) {
                            map.setFeatureState({ source: sourceId, sourceLayer: sl, id }, { selected: true })
                        }
                    } else {
                        map.setFeatureState({ source: sourceId, id }, { selected: true })
                    }
                } catch {
                    // source may not exist on map yet
                }
            }
        })

        return unsubscribe
    }, [ref])

    // Subscribe to reconcile bus — resets all feature states to the authoritative set
    useEffect(() => {
        const unsubscribe = onSelectionReconcile(({ ids, sourceId }) => {
            const map = ref?.getMap()
            const currentSourceId = sourceIdRef.current
            if (!map || !currentSourceId) return
            if (currentSourceId !== sourceId) return

            const sourceLayers = sourceLayersRef.current
            const isVector = sourceLayers.length > 0

            try {
                if (isVector) {
                    for (const sl of sourceLayers) {
                        map.removeFeatureState({ source: currentSourceId, sourceLayer: sl })
                    }
                } else {
                    map.removeFeatureState({ source: currentSourceId })
                }
            } catch {
                // source may not exist on map yet
            }
            for (const id of ids) {
                try {
                    if (isVector) {
                        for (const sl of sourceLayers) {
                            map.setFeatureState({ source: currentSourceId, sourceLayer: sl, id }, { selected: true })
                        }
                    } else {
                        map.setFeatureState({ source: currentSourceId, id }, { selected: true })
                    }
                } catch {
                    // source may not exist on map yet
                }
            }
        })

        return unsubscribe
    }, [ref])
}

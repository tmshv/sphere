import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { onSelectionDelta } from "@/lib/selection-bus"
import { useEffect, useRef } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureState(ref: MapRef | undefined) {
    const selectedLayerId = useAppSelector(selectors.layer.selectSelectedId)
    const selectedSourceId = useAppSelector(selectors.source.selectSelectedId)
    const layerItems = useAppSelector(state => state.layer.items)

    const sourceIdRef = useRef<string | undefined>()

    // Keep sourceId ref in sync
    useEffect(() => {
        if (selectedLayerId) {
            const fromStore = layerItems[selectedLayerId]?.sourceId
            if (fromStore) {
                sourceIdRef.current = fromStore
                return
            }
            const mapLayer = ref?.getMap()?.getLayer(selectedLayerId)
            sourceIdRef.current = (mapLayer as { source?: string } | undefined)?.source
            return
        }
        sourceIdRef.current = selectedSourceId
    }, [selectedLayerId, layerItems, selectedSourceId, ref])

    // Subscribe to delta bus and apply incremental feature-state changes
    useEffect(() => {
        const unsubscribe = onSelectionDelta(delta => {
            const map = ref?.getMap()
            const sourceId = sourceIdRef.current
            if (!map || !sourceId) return

            for (const id of delta.removed) {
                try {
                    map.removeFeatureState({ source: sourceId, id })
                } catch {
                    // source may not exist on map yet
                }
            }
            for (const id of delta.added) {
                try {
                    map.setFeatureState({ source: sourceId, id }, { selected: true })
                } catch {
                    // source may not exist on map yet
                }
            }
        })

        return unsubscribe
    }, [ref])
}

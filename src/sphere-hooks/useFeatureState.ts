import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { useEffect, useMemo, useRef } from "react"
import type { MapRef } from "react-map-gl/maplibre"

type PrevSource = { sourceId: string; ids: number[] } | null

export default function useFeatureState(ref: MapRef | undefined) {
    const selectedIds = useAppSelector(state => state.selection.selectedIds)
    const selectedLayerId = useAppSelector(selectors.layer.selectSelectedId)
    const selectedSourceId = useAppSelector(selectors.source.selectSelectedId)
    const layerItems = useAppSelector(state => state.layer.items)

    const sourceId = useMemo(() => {
        // For layer-based selection: resolve source from the layer
        if (selectedLayerId) {
            const fromStore = layerItems[selectedLayerId]?.sourceId
            if (fromStore) return fromStore
            // Fall back to querying MapLibre for the layer's source (preview layers)
            const mapLayer = ref?.getMap()?.getLayer(selectedLayerId)
            return (mapLayer as { source?: string } | undefined)?.source
        }
        // For source-based selection (rect select): use source directly
        return selectedSourceId
    }, [selectedLayerId, layerItems, selectedSourceId, ref])

    const prevSource = useRef<PrevSource>(null)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        // Clear previous highlights
        const prev = prevSource.current
        if (prev) {
            map.removeFeatureState({ source: prev.sourceId })
        }

        // Apply new highlights
        if (selectedIds.length > 0 && sourceId) {
            for (const id of selectedIds) {
                map.setFeatureState({ source: sourceId, id }, { selected: true })
            }
            prevSource.current = { sourceId, ids: selectedIds }
        } else {
            prevSource.current = null
        }
    }, [ref, selectedIds, sourceId])
}

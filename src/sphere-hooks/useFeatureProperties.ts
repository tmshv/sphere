import useFP from "@/hooks/useFeatureProperties"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import type { MapRef } from "react-map-gl/maplibre"

const EMPTY: string[] = []

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectors.layer.selectSelectedId)
    const previewLayerIds = useAppSelector(selectors.preview.layerIds)
    const effectiveLayerIds = previewLayerIds.length > 0 || !layerId ? EMPTY : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}

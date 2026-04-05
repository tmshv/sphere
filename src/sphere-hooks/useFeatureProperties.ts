import useFP from "@/hooks/useFeatureProperties"
import { selectors } from "@/store"
import { selectShowFeatureProperties } from "@/store/app"
import { useAppSelector } from "@/store/hooks"
import type { MapRef } from "react-map-gl/maplibre"

const EMPTY: string[] = []

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectors.layer.selectSelectedId)
    const previewLayerIds = useAppSelector(selectors.preview.layerIds)
    const enabled = useAppSelector(selectShowFeatureProperties)
    const effectiveLayerIds = !enabled || previewLayerIds.length > 0 || !layerId ? EMPTY : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}

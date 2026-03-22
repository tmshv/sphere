import useFP from "@/hooks/useFeatureProperties"
import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import { selectCurrentLayer } from "@/store/selection"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectCurrentLayer)
    const previewLayerIds = useAppSelector(selectors.preview.layerIds)
    const effectiveLayerIds = previewLayerIds.length > 0 || !layerId ? [] : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}

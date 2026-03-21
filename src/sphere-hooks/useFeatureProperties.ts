import useFP from "@/hooks/useFeatureProperties"
import { useAppSelector } from "@/store/hooks"
import { selectCurrentLayer } from "@/store/selection"
import { selectPreviewLayerIds } from "@/store/selectors"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectCurrentLayer)
    const previewLayerIds = useAppSelector(selectPreviewLayerIds)
    const effectiveLayerIds = previewLayerIds.length > 0 || !layerId ? [] : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}

import useFP from "@/hooks/useFeatureProperties"
import { useAppSelector } from "@/store/hooks"
import { selectCurrentLayer } from "@/store/selection"
import { selectPreviewSourceId } from "@/store/selectors"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectCurrentLayer)
    const previewSourceId = useAppSelector(selectPreviewSourceId)
    const effectiveLayerIds = previewSourceId || !layerId ? [] : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}

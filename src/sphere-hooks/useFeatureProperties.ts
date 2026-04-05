import useFP from "@/hooks/useFeatureProperties"
import { isHoverPopupEnabled } from "@/lib/map-tools"
import { selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppSelector } from "@/store/hooks"
import type { MapRef } from "react-map-gl/maplibre"

const EMPTY: string[] = []

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const layerId = useAppSelector(selectors.layer.selectSelectedId)
    const previewLayerIds = useAppSelector(selectors.preview.layerIds)
    const mapTool = useAppSelector(selectMapTool)
    const hoverEnabled = isHoverPopupEnabled(mapTool)
    const effectiveLayerIds = !hoverEnabled || previewLayerIds.length > 0 || !layerId ? EMPTY : [layerId]
    useFP(ref, effectiveLayerIds, delay)
}

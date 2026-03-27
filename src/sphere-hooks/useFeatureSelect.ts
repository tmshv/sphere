import { queryFeaturesInPoint } from "@/lib/maplibre"
import { actions, selectors } from "@/store"
import { selectMapTool } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

const selectClickableLayerIds = createSelector(
    [selectors.layer.visibleIds, selectors.preview.layerIds],
    (layerIds, previewLayerIds) => (previewLayerIds.length > 0 ? [...layerIds, ...previewLayerIds] : layerIds),
)

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectClickableLayerIds)
    const mapTool = useAppSelector(selectMapTool)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map || mapTool === "select") {
            return
        }

        const click = map.on("click", event => {
            const features = queryFeaturesInPoint(event.target, event.point, layerIds)
            if (features.length > 0) {
                const f = features[0]
                const featureId = f.id
                if (typeof featureId !== "number") {
                    return
                }
                dispatch(actions.selection.selectOne({ featureId }))
                return
            }
            dispatch(actions.selection.resetFeature())
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, ref, layerIds, mapTool])

    return null
}

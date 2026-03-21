import { queryFeaturesInPoint } from "@/lib/maplibre"
import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectPreviewLayerIds } from "@/store/selectors"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

const selectClickableLayerIds = createSelector(
    [selectors.layer.visibleIds, selectPreviewLayerIds],
    (layerIds, previewLayerIds) => (previewLayerIds.length > 0 ? [...layerIds, ...previewLayerIds] : layerIds),
)

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectClickableLayerIds)
    const previewLayerIds = useAppSelector(selectPreviewLayerIds)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const click = map.on("click", event => {
            const features = queryFeaturesInPoint(event.target, event.point, layerIds)
            if (features.length > 0) {
                const f = features[0]
                dispatch(
                    actions.selection.selectOne({
                        layerId: f.layer?.id,
                        featureId: f.id as number,
                    }),
                )
                return
            }
            if (previewLayerIds.length > 0) {
                // Source preview is active; map clicks don't affect source selection
                return
            }
            dispatch(actions.selection.reset())
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, ref, layerIds, previewLayerIds])

    return null
}

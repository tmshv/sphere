import { queryFeaturesInPoint } from "@/lib/maplibre"
import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectPreviewSourceId } from "@/store/selectors"
import { PREVIEW_LAYER_IDS } from "@/components/SphereMap/SourcePreviewLayer"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

const selectClickableLayerIds = createSelector(
    [selectors.layer.visibleIds, selectPreviewSourceId],
    (layerIds, previewSourceId) => (previewSourceId ? [...layerIds, ...PREVIEW_LAYER_IDS] : layerIds),
)

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectClickableLayerIds)
    const previewSourceId = useAppSelector(selectPreviewSourceId)

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
            if (previewSourceId) {
                // Source preview is active; map clicks don't affect source selection
                return
            }
            dispatch(actions.selection.reset())
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, ref, layerIds, previewSourceId])

    return null
}

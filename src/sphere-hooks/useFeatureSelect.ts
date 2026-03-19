import { queryFeaturesInPoint } from "@/lib/maplibre"
import { actions, selectors } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectPreviewSourceId } from "@/store/selectors"
import { useEffect, useMemo } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectors.layer.visibleIds)
    const previewSourceId = useAppSelector(selectPreviewSourceId)
    const previewLayerIds = useMemo(
        () =>
            previewSourceId
                ? [
                      `preview-${previewSourceId}-point`,
                      `preview-${previewSourceId}-line`,
                      `preview-${previewSourceId}-polygon`,
                      `preview-${previewSourceId}-line-outline`,
                      `preview-${previewSourceId}-polygon-outline-0`,
                      `preview-${previewSourceId}-polygon-outline-1`,
                  ]
                : [],
        [previewSourceId],
    )

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
                const previewFeatures = queryFeaturesInPoint(event.target, event.point, previewLayerIds)
                if (previewFeatures.length > 0) {
                    return
                }
            }
            dispatch(actions.selection.reset())
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, ref, layerIds, previewLayerIds])

    return null
}

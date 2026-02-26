import type { MapRef } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions, selectors } from "@/store"
import { queryFeaturesInPoint } from "@/lib/maplibre"

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectors.layer.visibleIds)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const click = map.on("click", event => {
            const features = queryFeaturesInPoint(event.target, event.point, layerIds)
            if (features.length > 0) {
                const f = features[0]
                dispatch(actions.selection.selectOne({
                    layerId: f.layer!.id,
                    featureId: f.id as number,
                }))
            } else {
                dispatch(actions.selection.reset())
            }
        })

        return () => {
            click.unsubscribe()
        }
    }, [dispatch, ref, layerIds])

    return null
}

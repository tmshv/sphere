import type { Map, Point, PointLike } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectVisibleLayerIds } from "@/store/layer"

export function queryFeaturesInPoint(map: Map, point: Point, layers: string[]) {
    const size = 8
    const bbox: [PointLike, PointLike] = [
        [point.x - size / 2, point.y - size / 2],
        [point.x + size / 2, point.y + size / 2],
    ]
    const features = map.queryRenderedFeatures(bbox, {
        layers,
    })

    if (features.length === 0) {
        return []
    }

    return features
}

export default function useFeatureSelect(ref: MapRef | undefined) {
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectVisibleLayerIds)

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
    }, [ref, layerIds])

    return null
}

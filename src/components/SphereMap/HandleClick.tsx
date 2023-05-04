import { useMap } from "react-map-gl"
import { useEffect } from "react"
import mapboxgl, { Point } from "mapbox-gl"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectVisibleLayerIds } from "@/store/layer"

export function queryFeaturesInPoint(map: mapboxgl.Map, point: Point, layers: string[]) {
    const size = 8
    const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
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

export type HandleClickProps = {
}

export const HandleClick: React.FC<HandleClickProps> = () => {
    const { current: ref } = useMap()
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectVisibleLayerIds)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const handler = (event: mapboxgl.MapMouseEvent) => {
            const features = queryFeaturesInPoint(event.target, event.point, layerIds)
            if (features.length > 0) {
                const f = features[0]
                dispatch(actions.selection.selectOne({
                    layerId: f.layer.id,
                    featureId: f.id as number,
                }))
            } else {
                dispatch(actions.selection.reset())
            }
        }

        map.on("click", handler)

        return () => {
            map.off("click", handler)
        }
    }, [ref, layerIds])

    return null
}

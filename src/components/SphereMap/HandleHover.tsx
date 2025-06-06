import { useMap } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectVisibleLayerIds } from "@/store/layer"

export type HandleHoverProps = {
    mapId: string
}

export const HandleHover: React.FC<HandleHoverProps> = ({ mapId }) => {
    const { [mapId]: map } = useMap()
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectVisibleLayerIds)

    useEffect(() => {
        if (!map) {
            return
        }

        // Skip setup in case
        // - No layers in scene
        // - All layers are invisible
        if (layerIds.length === 0) {
            return
        }

        const subscriptions = layerIds.flatMap(layerId => {
            const enter = map.on("mouseenter", layerId, () => {
                dispatch(actions.map.setInteractive({
                    mapId,
                    value: true,
                }))
            })
            const  leave = map.on("mouseleave", layerId, () => {
                dispatch(actions.map.setInteractive({
                    mapId,
                    value: false,
                }))
            })
            return [enter, leave]
        })

        return () => {
            for (const s of subscriptions) {
                s.unsubscribe()
            }
        }
    }, [map, mapId, layerIds])

    return null
}

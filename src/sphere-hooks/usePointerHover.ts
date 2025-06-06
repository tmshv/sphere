import { useEffect } from "react"
import { useMap } from "react-map-gl/maplibre"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectVisibleLayerIds } from "@/store/layer"

export default function usePointerHover(mapId: string) {
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

        const subscriptions = layerIds.flatMap(layerId => [
            map.on("mouseenter", layerId, () => {
                dispatch(actions.map.setInteractive({
                    mapId,
                    value: true,
                }))
            }),
            map.on("mouseleave", layerId, () => {
                dispatch(actions.map.setInteractive({
                    mapId,
                    value: false,
                }))
            }),
        ])

        return () => {
            for (const s of subscriptions) {
                s.unsubscribe()
            }
        }
    }, [map, mapId, layerIds])
}

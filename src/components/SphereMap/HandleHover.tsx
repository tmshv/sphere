import { useMap } from "react-map-gl"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectVisibleLayerIds } from "@/store/layer"
import type { Map as MapGL } from "maplibre-gl"

export type HandleHoverProps = {
    mapId: string
}

export const HandleHover: React.FC<HandleHoverProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectVisibleLayerIds)

    useEffect(() => {
        const map = ref?.getMap() as MapGL | undefined
        if (!map) {
            return
        }

        // Skip setup in case
        // - No layers in scene
        // - All layers are invisible
        if (layerIds.length === 0) {
            return
        }

        const enter = () => {
            dispatch(actions.map.setInteractive({
                mapId,
                value: true,
            }))
        }

        const leave = () => {
            dispatch(actions.map.setInteractive({
                mapId,
                value: false,
            }))
        }

        for (const layerId of layerIds) {
            map.on("mouseover", layerId, enter)
            map.on("mouseout", layerId, leave)
        }

        return () => {
            for (const layerId of layerIds) {
                map.off("mouseover", layerId, enter)
                map.off("mouseout", layerId, leave)
            }
        }
    }, [ref, mapId, layerIds])

    return null
}

import { useMap } from "react-map-gl";
import { useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { actions } from "@/store";
import { selectVisibleLayerIds } from "@/store/layer";

export type HandleHoverProps = {
    mapId: string
}

export const HandleHover: React.FC<HandleHoverProps> = ({ mapId }) => {
    const { [mapId]: ref } = useMap()
    const dispatch = useAppDispatch()
    const layerIds = useAppSelector(selectVisibleLayerIds)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const enter = (event: mapboxgl.MapMouseEvent) => {
            console.log('enter')
            dispatch(actions.map.setInteractive({
                mapId,
                value: true,
            }))
        }

        const leave = (event: mapboxgl.MapMouseEvent) => {
            console.log('leave')
            dispatch(actions.map.setInteractive({
                mapId,
                value: false,
            }))
        }

        for (const id in layerIds) {
            map.on('mouseenter', id, enter)
            map.on('mouseleave', id, leave)
        }

        return () => {
            for (const id in layerIds) {
                map.off('mouseenter', id, enter)
                map.off('mouseleave', id, leave)
            }
        }
    }, [ref, mapId, layerIds])

    return null
}

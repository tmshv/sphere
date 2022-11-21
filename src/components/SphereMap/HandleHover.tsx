import { useMap } from "react-map-gl";
import { useEffect } from "react";
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

        map.on('mouseenter', layerIds, enter)
        map.on('mouseleave', layerIds, leave)

        return () => {
            map.off('mouseenter', layerIds, enter)
            map.off('mouseleave', layerIds, leave)
        }
    }, [ref, mapId, layerIds])

    return null
}

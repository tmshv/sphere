import { useMap } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectCurrentLayer } from "@/store/selection"
import type { Map, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl"

export type PropertiesPopupProps = {
    id: string
}

export const PropertiesPopup: React.FC<PropertiesPopupProps> = ({ id }) => {
    const { [id]: ref } = useMap()
    const dispatch = useAppDispatch()
    const layerId = useAppSelector(selectCurrentLayer)

    useEffect(() => {
        const map = ref?.getMap() as Map | undefined
        if (!map) {
            return
        }

        if (!layerId) {
            return
        }

        const enter = (event: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
            if (!event.features) {
                dispatch(actions.properties.reset())
                return
            }
            if (event.features.length === 0) {
                dispatch(actions.properties.reset())
                return
            }
            dispatch(actions.properties.set({
                values: event.features.map(f => f.properties),
            }))
        }

        const leave = () => {
            dispatch(actions.properties.reset())
        }

        map.on("mousemove", layerId, enter)
        map.on("mouseout", layerId, leave)

        return () => {
            map.off("mousemove", layerId, enter)
            map.off("mouseout", layerId, leave)
        }
    }, [ref, layerId])

    return null
}

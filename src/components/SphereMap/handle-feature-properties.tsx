import { useMap } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectCurrentLayer } from "@/store/selection"
import type { Map, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl"

export type HandleFeaturePropertiesProps = {
    id: string
    delay: number
}

export default function HandleFeatureProperties({ id, delay }: HandleFeaturePropertiesProps) {
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

        let stick = false
        let clickTime = Date.now()

        const enter = (event: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
            if (stick) {
                return
            }
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
            if (stick) {
                return
            }
            dispatch(actions.properties.reset())
        }

        const click = () => {
            stick = true
            clickTime = Date.now()
        }

        const clickOutside = () => {
            if (Date.now() - clickTime < delay) {
                return
            }
            stick = false
            dispatch(actions.properties.reset())
        }

        map.on("mousemove", layerId, enter)
        map.on("mouseout", layerId, leave)
        map.on("click", layerId, click)
        map.on("click", clickOutside)

        return () => {
            map.off("mousemove", layerId, enter)
            map.off("mouseout", layerId, leave)
            map.off("click", layerId, click)
            map.off("click", clickOutside)
        }
    }, [ref, layerId, delay])

    return null
}

import { useMap } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectCurrentLayer } from "@/store/selection"
import type { Map, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl"
import useFeatureClick from "@/hooks/useFeatureClick"

export type HandleFeaturePropertiesProps = {
    id: string
    delay: number
}

export default function HandleFeatureProperties({ id, delay }: HandleFeaturePropertiesProps) {
    const { [id]: ref } = useMap()
    const dispatch = useAppDispatch()
    const layerId = useAppSelector(selectCurrentLayer)
    const features = useFeatureClick(id, layerId, delay)

    useEffect(() => {
        if (!features) {
            dispatch(actions.properties.reset())
            return
        }
        dispatch(actions.properties.set({
            values: features.map(f => f.properties),
        }))
    }, [features])

    useEffect(() => {
        const map = ref?.getMap() as Map | undefined
        if (!map) {
            return
        }

        if (!layerId) {
            return
        }

        const enter = (event: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
            if (features) {
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
            if (features) {
                return
            }
            dispatch(actions.properties.reset())
        }

        map.on("mousemove", layerId, enter)
        map.on("mouseout", layerId, leave)

        return () => {
            map.off("mousemove", layerId, enter)
            map.off("mouseout", layerId, leave)
        }
    }, [ref, layerId, features])

    return null
}

import { MapRef } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { actions } from "@/store"
import { selectCurrentLayer } from "@/store/selection"
import useFeatureClick from "@/hooks/useFeatureClick"

export default function useFeatureProperties(ref: MapRef | undefined, delay: number) {
    const dispatch = useAppDispatch()
    const layerId = useAppSelector(selectCurrentLayer)
    const features = useFeatureClick(ref, layerId, delay)

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
        const map = ref?.getMap()
        if (!map) {
            return
        }

        if (!layerId) {
            return
        }

        const enter = map.on("mousemove", layerId, (event) => {
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
        })
        const leave = map.on("mouseout", layerId, () => {
            if (features) {
                return
            }
            dispatch(actions.properties.reset())
        })

        return () => {
            enter.unsubscribe()
            leave.unsubscribe()
        }
    }, [ref, layerId, features])
}

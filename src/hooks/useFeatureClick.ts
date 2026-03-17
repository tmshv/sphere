import type { Map, MapGeoJSONFeature } from "maplibre-gl"
import { useEffect, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureClick(ref: MapRef | undefined, layerId: string | undefined, delay: number) {
    const [features, setFeatures] = useState<MapGeoJSONFeature[] | undefined>()

    useEffect(() => {
        const map = ref?.getMap() as Map | undefined
        if (!map) {
            return
        }
        if (!layerId) {
            return
        }

        let clickTime = 0
        const click = map.on("click", layerId, event => {
            if (!event.features) {
                return
            }
            clickTime = Date.now()
            setFeatures(event.features)
        })
        const clickOutside = map.on("click", () => {
            if (Date.now() - clickTime < delay) {
                return
            }
            setFeatures(undefined)
        })

        return () => {
            click.unsubscribe()
            clickOutside.unsubscribe()
        }
    }, [ref, layerId, delay])

    return features
}

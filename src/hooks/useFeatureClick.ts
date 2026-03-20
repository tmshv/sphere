import type { MapGeoJSONFeature, Map as MaplibreMap } from "maplibre-gl"
import { useEffect, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export default function useFeatureClick(
    ref: MapRef | undefined,
    layerId: string | string[] | undefined,
    delay: number,
) {
    const [features, setFeatures] = useState<MapGeoJSONFeature[] | undefined>()

    useEffect(() => {
        const map = ref?.getMap() as MaplibreMap | undefined
        if (!map) {
            return
        }
        const ids = Array.isArray(layerId) ? layerId : layerId ? [layerId] : []
        if (ids.length === 0) {
            setFeatures(undefined)
            return
        }

        let clickTime = 0

        const layerListeners = ids.map(id =>
            map.on("click", id, event => {
                if (!event.features) {
                    return
                }
                clickTime = Date.now()
                setFeatures(event.features)
            }),
        )

        const clickOutside = map.on("click", () => {
            if (Date.now() - clickTime < delay) {
                return
            }
            setFeatures(undefined)
        })

        return () => {
            for (const listener of layerListeners) {
                listener.unsubscribe()
            }
            clickOutside.unsubscribe()
        }
    }, [ref, layerId, delay])

    return features
}

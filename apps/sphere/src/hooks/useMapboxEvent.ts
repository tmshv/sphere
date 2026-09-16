import type { Map as MaplibreMap, MapEventType } from "maplibre-gl"
import { useCallback, useEffect } from "react"
import { useMap } from "react-map-gl/maplibre"

export type MapboxEventCallback<T extends keyof MapEventType> = (map: MaplibreMap, event: MapEventType[T]) => void
type OnEvent<T extends keyof MapEventType> = (event: MapEventType[T]) => void

export function useMapboxEvent<T extends keyof MapEventType>(eventName: T, callback: MapboxEventCallback<T>) {
    const { current } = useMap()
    const map = current?.getMap()

    const onEvent = useCallback<OnEvent<T>>(
        event => {
            if (!map) {
                return
            }
            callback(map, event)
        },
        [callback, map],
    )

    useEffect(() => {
        if (!map) {
            return
        }
        map.on(eventName, onEvent)
        return () => {
            map.off(eventName, onEvent)
        }
    }, [eventName, map, onEvent])
}

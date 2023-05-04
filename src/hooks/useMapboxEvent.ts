import { useCallback, useEffect } from "react"
import { MapboxEvent } from "mapbox-gl"
import { useMap } from "react-map-gl"
// import { useMapbox } from './useMapbox'

export type MapboxEventCallback = (map: mapboxgl.Map, event: MapboxEvent) => void
type OnEvent = (event: MapboxEvent) => void

export function useMapboxEvent(eventName: string, callback: MapboxEventCallback) {
    const { current } = useMap()
    const map = current?.getMap()!

    const onEvent = useCallback<OnEvent>(event => {
        callback(map, event)
    }, [callback, map])

    useEffect(() => {
        map.on(eventName, onEvent)

        return () => {
            map.off(eventName, onEvent)
        }
    }, [eventName, map, onEvent])
}

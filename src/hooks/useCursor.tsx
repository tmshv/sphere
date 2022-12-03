import { MapLayerMouseEvent, MapRef } from "react-map-gl"
import { useEffect, useState } from "react"

export function useCursor(ref?: MapRef): [number, number] {
    const [[lng, lat], setCoord] = useState<[number, number]>([0, 0])
    useEffect(() => {
        if (!ref) {
            return
        }

        const map = ref.getMap()

        const callback = (event: MapLayerMouseEvent) => {
            setCoord([event.lngLat.lng, event.lngLat.lat])
        }

        map.on("mousemove", callback)

        return () => {
            map.off("mousemove", callback)
        }
    }, [ref])

    return [lng, lat]
}

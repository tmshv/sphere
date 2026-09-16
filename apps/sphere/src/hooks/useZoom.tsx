import { useEffect, useState } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export function useZoom(ref?: MapRef): number {
    const [zoom, setZoom] = useState<number>(0)
    useEffect(() => {
        if (!ref) {
            return
        }

        const map = ref.getMap()

        const z = () => {
            setZoom(map.getZoom())
        }

        map.on("zoom", z)
        setZoom(map.getZoom())

        return () => {
            map.off("zoom", z)
        }
    }, [ref])

    return zoom
}

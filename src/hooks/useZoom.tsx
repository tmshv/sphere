import { MapRef, ViewStateChangeEvent } from "react-map-gl";
import { useEffect, useState } from "react";

export function useZoom(ref?: MapRef): number {
    const [zoom, setZoom] = useState<number>(0)
    useEffect(() => {
        if (!ref) {
            return
        }

        const map = ref.getMap()

        const z = (event: ViewStateChangeEvent) => {
            setZoom(event.viewState.zoom)
        }

        map.on("zoom", z)
        setZoom(map.getZoom())

        return () => {
            map.off("zoom", z)
        }
    }, [ref])

    return zoom
}

import { useMap } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { removeMap, setMap } from "@/map"

export default function useMapStore(mapId: string) {
    const { [mapId]: ref } = useMap()

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        if (map.isStyleLoaded()) {
            setMap(mapId, map)
            return () => {
                removeMap(mapId)
            }
        }

        const load = map.on("load", () => {
            setMap(mapId, map)
        })

        return () => {
            load.unsubscribe()
            removeMap(mapId)
        }
    }, [ref, mapId])
}

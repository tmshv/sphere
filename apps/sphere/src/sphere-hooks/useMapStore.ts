import { removeMap, setMap } from "@/map"
import { useEffect } from "react"
import { useMap } from "react-map-gl/maplibre"

export default function useMapStore(mapId: string) {
    const { [mapId]: ref } = useMap()
    const map = ref?.getMap() ?? null

    useEffect(() => {
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
    }, [map, mapId])
}

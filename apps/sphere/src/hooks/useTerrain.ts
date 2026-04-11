import type { TerrainSpecification } from "maplibre-gl"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export type TerrainProps = {
    mapId: string
}

export default function useTerrain(ref: MapRef | undefined, options: TerrainSpecification | null) {
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const setupTerrain = () => {
            map.setTerrain(options)
        }

        if (map.isStyleLoaded()) {
            setupTerrain()

            return () => {
                if (map.isStyleLoaded()) {
                    map.setTerrain(null)
                }
            }
        }

        const load = map.on("load", setupTerrain)

        return () => {
            load.unsubscribe()
            if (map.isStyleLoaded()) {
                map.setTerrain(null)
            }
        }
    }, [ref, options])
}

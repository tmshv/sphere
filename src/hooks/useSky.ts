import type { SkySpecification } from "maplibre-gl"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

type MapWithSky = ReturnType<MapRef["getMap"]> & { setSky(sky?: SkySpecification): void }

export type SkyProps = {
    mapId: string
}

export default function useSky(ref: MapRef | undefined, sky: SkySpecification | undefined) {
    useEffect(() => {
        const map = ref?.getMap() as MapWithSky | undefined
        if (!map) {
            return
        }

        if (map.isStyleLoaded()) {
            map.setSky(sky)
            return () => {
                if (map.isStyleLoaded()) {
                    map.setSky(undefined)
                }
            }
        }

        const load = map.on("load", () => {
            map.setSky(sky)
        })

        return () => {
            load.unsubscribe()
            if (map.isStyleLoaded()) {
                map.setSky(undefined)
            }
        }
    }, [ref, sky])
}

import type { SkySpecification } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"
import { useEffect } from "react"

export type SkyProps = {
    mapId: string
}

export default function useSky(ref: MapRef | undefined, sky: SkySpecification | undefined) {
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        if (map.isStyleLoaded()) {
            // @ts-expect-error this is official api for reseting sky settings
            map.setSky(sky)
            return () => {
                if (map.isStyleLoaded()) {
                    // @ts-expect-error this is official api for reseting sky settings
                    map.setSky(undefined)
                }
            }
        }

        const load = map.on("load", () => {
            // @ts-expect-error this is official api for reseting sky settings
            map.setSky(sky)
        })

        return () => {
            load.unsubscribe()
            if (map.isStyleLoaded()) {
                // @ts-expect-error this is official api for reseting sky settings
                map.setSky(undefined)
            }
        }
    }, [ref, sky])
}

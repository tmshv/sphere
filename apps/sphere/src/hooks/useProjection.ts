import type { ProjectionSpecification } from "maplibre-gl"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

type ProjectionType = ProjectionSpecification["type"]

export default function useProjection(ref: MapRef | undefined, projection: ProjectionType, fallback: ProjectionType) {
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        const apply = () => {
            map.setProjection({ type: projection })
        }

        if (map.isStyleLoaded()) {
            apply()
            return () => {
                if (map.isStyleLoaded()) {
                    map.setProjection({ type: fallback })
                }
            }
        }

        const load = map.on("load", apply)

        return () => {
            load.unsubscribe()
            if (map.isStyleLoaded()) {
                map.setProjection({ type: fallback })
            }
        }
    }, [ref, projection, fallback])
}

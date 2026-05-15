import type { ProjectionSpecification } from "maplibre-gl"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

type ProjectionType = ProjectionSpecification["type"]

export default function useProjection(ref: MapRef | undefined, projection: ProjectionType) {
    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        let previous: ProjectionSpecification | undefined

        const apply = () => {
            previous = map.getProjection()
            map.setProjection({ type: projection })
        }

        const restore = () => {
            if (previous && map.isStyleLoaded()) {
                map.setProjection(previous)
            }
        }

        if (map.isStyleLoaded()) {
            apply()
            return restore
        }

        const load = map.on("load", apply)

        return () => {
            load.unsubscribe()
            restore()
        }
    }, [ref, projection])
}

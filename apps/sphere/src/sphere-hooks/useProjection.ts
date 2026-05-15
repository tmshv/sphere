import { selectors } from "@/store"
import { useAppSelector } from "@/store/hooks"
import type { Projection } from "@/types"
import { useEffect } from "react"
import type { MapRef } from "react-map-gl/maplibre"

export type ProjectionProps = {
    fallback: Projection
}

export default function useProjection(ref: MapRef | undefined, fallback: Projection) {
    const projection = useAppSelector(selectors.projection.projection)

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

    return null
}

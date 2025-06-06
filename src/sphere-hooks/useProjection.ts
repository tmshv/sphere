import { MapRef } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppSelector } from "@/store/hooks"
import { selectProjection } from "@/store/projection"
import type { Projection } from "@/types"

export type ProjectionProps = {
    fallback: Projection
}

export default function useProjection(ref: MapRef | undefined, fallback: Projection) {
    const projection = useAppSelector(selectProjection)

    useEffect(() => {
        const map = ref?.getMap()
        if (!map) {
            return
        }

        map.setProjection({
            type: projection,
        })

        return () => {
            map.setProjection({
                type: fallback,
            })
        }
    }, [ref, projection, fallback])

    return null
}

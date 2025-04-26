import { useMap } from "react-map-gl/maplibre"
import { useEffect } from "react"
import { useAppSelector } from "@/store/hooks"
import { selectProjection } from "@/store/projection"
import type { Projection as ProjectionT } from "@/types"

export type ProjectionProps = {
    fallback: ProjectionT
}

export const Projection: React.FC<ProjectionProps> = ({ fallback: fallbackProjection }) => {
    const { current: ref } = useMap()
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
                type: fallbackProjection,
            })
        }
    }, [projection, fallbackProjection])

    return null
}

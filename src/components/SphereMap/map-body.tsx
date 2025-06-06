import useTerrain from "@/hooks/useTerrain"
import useMapStore from "@/sphere-hooks/useMapStore"
import usePointerHover from "@/sphere-hooks/usePointerHover"
import useProjection from "@/sphere-hooks/useProjection"
import { useAppSelector } from "@/store/hooks"
import { selectTerrainSpecification } from "@/store/terrain"
import { useMap } from "react-map-gl/maplibre"

export type MapBodyProps = {
    mapId: string
}

export default function MapBody({ mapId }: MapBodyProps) {
    useMapStore(mapId)
    const { [mapId]: map } = useMap()
    const terrain = useAppSelector(selectTerrainSpecification)
    useTerrain(map, terrain)
    useProjection(map, "mercator")
    usePointerHover(mapId)
    return null
}

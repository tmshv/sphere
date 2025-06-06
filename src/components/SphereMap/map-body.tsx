import useTerrain from "@/hooks/useTerrain"
import usePointerHover from "@/sphere-hooks/usePointerHover"
import { useAppSelector } from "@/store/hooks"
import { selectTerrainSpecification } from "@/store/terrain"
import { useMap } from "react-map-gl/maplibre"

export type MapBodyProps = {
    mapId: string
}

export default function MapBody({ mapId }: MapBodyProps) {
    const { [mapId]: map } = useMap()
    const terrain = useAppSelector(selectTerrainSpecification)
    useTerrain(map, terrain)
    usePointerHover(mapId)
    return null
}

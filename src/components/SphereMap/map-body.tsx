import { useMap } from "react-map-gl/maplibre"
import useTerrain from "@/hooks/useTerrain"
import usePointerHover from "@/sphere-hooks/usePointerHover"
import { useAppSelector } from "@/store/hooks"
import { selectExaggeration, selectIsShowTerrain } from "@/store/terrain"

export type MapBodyProps = {
    mapId: string
}

export default function MapBody({ mapId }: MapBodyProps) {
    const { [mapId]: map } = useMap()
    const terrain = useAppSelector(selectIsShowTerrain)
    const exaggeration = useAppSelector(selectExaggeration)
    useTerrain(map, !terrain ? null : {
        source: "mapbox-dem",
        exaggeration,
    })

    usePointerHover(mapId)
    return null
}

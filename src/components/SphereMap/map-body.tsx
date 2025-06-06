import useSky from "@/hooks/useSky"
import useTerrain from "@/hooks/useTerrain"
import useFeatureProperties from "@/sphere-hooks/useFeatureProperties"
import useFeatureSelect from "@/sphere-hooks/useFeatureSelect"
import useMapStore from "@/sphere-hooks/useMapStore"
import usePointerHover from "@/sphere-hooks/usePointerHover"
import useProjection from "@/sphere-hooks/useProjection"
import { useAppSelector } from "@/store/hooks"
import { selectSkySpecification } from "@/store/sky"
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
    const sky = useAppSelector(selectSkySpecification)
    useSky(map, sky)
    useProjection(map, "mercator")
    usePointerHover(mapId)
    useFeatureSelect(map)
    useFeatureProperties(map, 50)
    return null
}

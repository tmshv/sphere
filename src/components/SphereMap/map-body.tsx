import useSky from "@/hooks/useSky"
import useTerrain from "@/hooks/useTerrain"
import useFeatureProperties from "@/sphere-hooks/useFeatureProperties"
import useFeatureSelect from "@/sphere-hooks/useFeatureSelect"
import useMapStore from "@/sphere-hooks/useMapStore"
import usePointerHover from "@/sphere-hooks/usePointerHover"
import useProjection from "@/sphere-hooks/useProjection"
import { selectShowAttribution } from "@/store/app"
import { selectIsDrawing } from "@/store/draw"
import { useAppSelector } from "@/store/hooks"
import { selectSkySpecification } from "@/store/sky"
import { selectTerrainSpecification } from "@/store/terrain"
import { AttributionControl, useMap } from "react-map-gl/maplibre"
import { SphereSource } from "./SphereSource"
import { SphereLayer } from "./SphereLayer"
import Draw from "./Draw"

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

    const drawing = useAppSelector(selectIsDrawing)
    const showAttribution = useAppSelector(selectShowAttribution)
    const sourceIds = useAppSelector(state => state.source.allIds)
    const layers = useAppSelector(state => {
        // Do not show layers in draw mode
        if (drawing) {
            return []
        }
        return state.layer.allIds
            .map(id => {
                const layer = state.layer.items[id]
                return {
                    id: layer.id,
                    index: layer.fractionIndex,
                }
            })
            .sort((a, b) => a.index - b.index)
    })

    return (
        <>
            {!showAttribution ? null : (
                <AttributionControl compact />
            )}
            {sourceIds.map(id => (
                <SphereSource
                    key={id}
                    id={id}
                />
            ))}
            {layers.map(({ id }) => (
                <SphereLayer
                    key={id}
                    id={id}
                />
            ))}
            {!drawing ? null : (
                <Draw mapId={mapId} />
            )}
        </>
    )
}

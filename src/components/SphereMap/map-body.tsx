import useMapNavigation from "@/hooks/useMapNavigation"
import useSky from "@/hooks/useSky"
import useTerrain from "@/hooks/useTerrain"
import useFeatureProperties from "@/sphere-hooks/useFeatureProperties"
import useFeatureSelect from "@/sphere-hooks/useFeatureSelect"
import useFeatureState from "@/sphere-hooks/useFeatureState"
import useMapStore from "@/sphere-hooks/useMapStore"
import usePointerHover from "@/sphere-hooks/usePointerHover"
import useProjection from "@/sphere-hooks/useProjection"
import useTileBoundaries from "@/sphere-hooks/useTileBoundaries"
import { selectors } from "@/store"
import { selectShowAttribution } from "@/store/app"
import { useAppSelector } from "@/store/hooks"
import { selectSkySpecification } from "@/store/sky"
import { selectTerrainSpecification } from "@/store/terrain"
import { createSelector } from "@reduxjs/toolkit"
import React from "react"
import { AttributionControl, useMap } from "react-map-gl/maplibre"
import Draw from "./Draw"
import { FilteredLayerSource } from "./FilteredLayerSource"
import RectSelectOverlay from "./RectSelectOverlay"
import { SourcePreviewLayer } from "./SourcePreviewLayer"
import { SphereLayer } from "./SphereLayer"
import { SphereSource } from "./SphereSource"

const selectLayers = createSelector(
    [selectors.draw.isDrawing, selectors.preview.sourceId, selectors.layer.items, selectors.layer.allIds],
    (drawing, previewSourceId, items, allIds) => {
        // Do not show layers in draw mode or when a source is actively previewed
        if (drawing || previewSourceId) {
            return []
        }
        return allIds
            .map(id => {
                const layer = items[id]
                return {
                    id: layer.id,
                    index: layer.fractionIndex,
                }
            })
            .sort((a, b) => a.index - b.index)
    },
)

export type MapBodyProps = {
    mapId: string
}

export default function MapBody({ mapId }: MapBodyProps) {
    useMapStore(mapId)
    const { [mapId]: map } = useMap()
    useMapNavigation(map)

    const terrain = useAppSelector(selectTerrainSpecification)
    useTerrain(map, terrain)

    const sky = useAppSelector(selectSkySpecification)
    useSky(map, sky)

    useProjection(map, "mercator")
    usePointerHover(mapId)
    useFeatureSelect(map)
    useFeatureState(map)
    useFeatureProperties(map, 50)
    useTileBoundaries(map)

    const drawing = useAppSelector(selectors.draw.isDrawing)
    const showAttribution = useAppSelector(selectShowAttribution)
    const sourceIds = useAppSelector(selectors.source.allIds)
    const layers = useAppSelector(selectLayers)
    const previewSourceId = useAppSelector(selectors.preview.sourceId)

    return (
        <>
            {!showAttribution ? null : <AttributionControl compact />}
            {sourceIds.map(id => (
                <SphereSource key={id} id={id} />
            ))}
            {!drawing && previewSourceId && <SourcePreviewLayer mapId={mapId} delay={50} />}
            {layers.map(({ id }) => (
                <React.Fragment key={id}>
                    <FilteredLayerSource layerId={id} />
                    <SphereLayer id={id} />
                </React.Fragment>
            ))}
            {!drawing ? null : <Draw mapId={mapId} />}
            <RectSelectOverlay mapRef={map} />
        </>
    )
}

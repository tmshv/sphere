import useFeatureClick from "@/hooks/useFeatureClick"
import { actions } from "@/store"
import { selectActiveSidebarTab } from "@/store/app"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { SourceType } from "@/types"
import type { RootState } from "@/store"
import { createSelector } from "@reduxjs/toolkit"
import { useEffect } from "react"
import { Layer, useMap } from "react-map-gl/maplibre"

const PREVIEW_COLOR = "#1c7ed6"

const selectPreviewSourceId = createSelector(
    [
        (state: RootState) => state.selection.sourceId,
        (state: RootState) => state.source.items,
        selectActiveSidebarTab,
    ],
    (sourceId, items, tab) => {
        if (tab !== "sources") return undefined
        if (!sourceId) return undefined
        const source = items[sourceId]
        if (!source) return undefined
        if (source.type !== SourceType.Geojson && source.type !== SourceType.FeatureCollection) return undefined
        return sourceId
    },
)

export type SourcePreviewLayerProps = {
    mapId: string
    delay: number
}

export function SourcePreviewLayer({ mapId, delay }: SourcePreviewLayerProps) {
    const dispatch = useAppDispatch()
    const { [mapId]: map } = useMap()
    const sourceId = useAppSelector(selectPreviewSourceId)

    const layerIds = sourceId
        ? [
              `preview-${sourceId}-point`,
              `preview-${sourceId}-line`,
              `preview-${sourceId}-polygon`,
          ]
        : undefined

    const features = useFeatureClick(map, layerIds, delay)

    useEffect(() => {
        if (!features) {
            dispatch(actions.properties.reset())
            return
        }
        dispatch(actions.properties.set({ values: features.map(f => f.properties) }))
    }, [dispatch, features])

    if (!sourceId) {
        return null
    }

    const pointId = `preview-${sourceId}-point`
    const lineId = `preview-${sourceId}-line`
    const polygonId = `preview-${sourceId}-polygon`

    return (
        <>
            {/* Points: circle + stroke */}
            <Layer
                id={pointId}
                source={sourceId}
                type="circle"
                filter={["==", ["geometry-type"], "Point"]}
                paint={{
                    "circle-color": PREVIEW_COLOR,
                    "circle-radius": 4,
                    "circle-stroke-color": "white",
                    "circle-stroke-width": 1,
                }}
            />
            {/* Lines: casing then fill */}
            <Layer
                id={`${lineId}-outline`}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "LineString"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "#fff", "line-width": 3 }}
            />
            <Layer
                id={lineId}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "LineString"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": PREVIEW_COLOR, "line-width": 1 }}
            />
            {/* Polygons: fill + double outline */}
            <Layer
                id={polygonId}
                source={sourceId}
                type="fill"
                filter={["==", ["geometry-type"], "Polygon"]}
                paint={{ "fill-color": PREVIEW_COLOR, "fill-opacity": 0.25 }}
            />
            <Layer
                id={`${polygonId}-outline-0`}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "Polygon"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "white", "line-width": 1, "line-offset": -1 }}
            />
            <Layer
                id={`${polygonId}-outline-1`}
                source={sourceId}
                type="line"
                filter={["==", ["geometry-type"], "Polygon"]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": PREVIEW_COLOR, "line-width": 1 }}
            />
        </>
    )
}

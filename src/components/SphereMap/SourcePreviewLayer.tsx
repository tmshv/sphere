import { EMPTY_GEOJSON } from "@/const"
import useFeatureProperties from "@/hooks/useFeatureProperties"
import { tableu10 } from "@/lib/color-scheme"
import logger from "@/logger"
import { useAppSelector } from "@/store/hooks"
import { selectPreviewSourceId } from "@/store/selectors"
import { SourceType } from "@/types"
import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"
import { Layer, Source, useMap } from "react-map-gl/maplibre"

const PREVIEW_SOURCE_ID = "sphere-preview"

export const PREVIEW_LAYER_IDS = [
    "preview-point",
    "preview-line-outline",
    "preview-line",
    "preview-polygon",
    "preview-polygon-outline-0",
    "preview-polygon-outline-1",
]

const PREVIEW_COLOR = tableu10[0]

export type SourcePreviewLayerProps = {
    mapId: string
    delay: number
}

export function SourcePreviewLayer({ mapId, delay }: SourcePreviewLayerProps) {
    const { [mapId]: map } = useMap()
    const sourceId = useAppSelector(selectPreviewSourceId)
    const source = useAppSelector(state => (sourceId ? (state.source.items[sourceId] ?? null) : null))
    const [previewData, setPreviewData] = useState<GeoJSON.FeatureCollection>(
        EMPTY_GEOJSON as GeoJSON.FeatureCollection,
    )

    useEffect(() => {
        if (!sourceId || !source) {
            setPreviewData(EMPTY_GEOJSON as GeoJSON.FeatureCollection)
            return
        }
        if (source.type === SourceType.FeatureCollection && !source.pending) {
            setPreviewData(source.dataset)
            return
        }
        if (source.type === SourceType.Geojson) {
            invoke<string>("source_get", { id: sourceId })
                .then(json => {
                    setPreviewData(JSON.parse(json))
                })
                .catch(err => {
                    logger.error({ err }, "Failed to fetch preview data for source %s", sourceId)
                    setPreviewData(EMPTY_GEOJSON as GeoJSON.FeatureCollection)
                })
        }
    }, [sourceId, source])

    useFeatureProperties(map, sourceId ? PREVIEW_LAYER_IDS : undefined, delay)

    if (!sourceId) {
        return null
    }

    const [pointId, lineOutlineId, lineId, polygonId, polygonOutline0Id, polygonOutline1Id] = PREVIEW_LAYER_IDS

    return (
        <>
            <Source id={PREVIEW_SOURCE_ID} type="geojson" data={previewData} />
            {/* Points */}
            <Layer
                id={pointId}
                source={PREVIEW_SOURCE_ID}
                type="circle"
                filter={["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]]}
                paint={{
                    "circle-color": PREVIEW_COLOR,
                    "circle-radius": 3,
                    "circle-stroke-color": "white",
                    "circle-stroke-width": 1,
                }}
            />
            {/* Lines: casing then fill */}
            <Layer
                id={lineOutlineId}
                source={PREVIEW_SOURCE_ID}
                type="line"
                filter={["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "#fff", "line-width": 3 }}
            />
            <Layer
                id={lineId}
                source={PREVIEW_SOURCE_ID}
                type="line"
                filter={["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": PREVIEW_COLOR, "line-width": 1 }}
            />
            {/* Polygons: fill + double outline */}
            <Layer
                id={polygonId}
                source={PREVIEW_SOURCE_ID}
                type="fill"
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                paint={{ "fill-color": PREVIEW_COLOR, "fill-opacity": 0.25 }}
            />
            <Layer
                id={polygonOutline0Id}
                source={PREVIEW_SOURCE_ID}
                type="line"
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "white", "line-width": 1, "line-offset": -1 }}
            />
            <Layer
                id={polygonOutline1Id}
                source={PREVIEW_SOURCE_ID}
                type="line"
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": PREVIEW_COLOR, "line-width": 1 }}
            />
        </>
    )
}

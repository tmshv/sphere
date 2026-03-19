import { EMPTY_GEOJSON } from "@/const"
import useFeatureClick from "@/hooks/useFeatureClick"
import { tableu10 } from "@/lib/color-scheme"
import { actions } from "@/store"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { selectPreviewSourceId } from "@/store/selectors"
import { SourceType } from "@/types"
import { invoke } from "@tauri-apps/api/core"
import type { MapGeoJSONFeature } from "maplibre-gl"
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
    const dispatch = useAppDispatch()
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
                .catch(() => {
                    setPreviewData(EMPTY_GEOJSON as GeoJSON.FeatureCollection)
                })
        }
    }, [sourceId, source])

    const features = useFeatureClick(map, sourceId ? PREVIEW_LAYER_IDS : undefined, delay)

    useEffect(() => {
        if (!features) {
            dispatch(actions.properties.reset())
            return
        }
        dispatch(actions.properties.set({ values: features.map(f => f.properties ?? {}) }))
    }, [dispatch, features])

    useEffect(() => {
        const mapInstance = map?.getMap()
        if (!mapInstance || !sourceId) {
            return
        }

        const handlers = PREVIEW_LAYER_IDS.flatMap(id => [
            mapInstance.on("mousemove", id, event => {
                if (features) {
                    return
                }
                if (!event.features || event.features.length === 0) {
                    return
                }
                const seen = new Set<MapGeoJSONFeature["id"]>()
                const deduped: MapGeoJSONFeature[] = []
                for (const f of event.features) {
                    if (f.id === undefined) {
                        deduped.push(f)
                    } else if (!seen.has(f.id)) {
                        seen.add(f.id)
                        deduped.push(f)
                    }
                }
                dispatch(actions.properties.set({ values: deduped.map(f => f.properties ?? {}) }))
            }),
            mapInstance.on("mouseleave", id, () => {
                if (features) {
                    return
                }
                dispatch(actions.properties.reset())
            }),
        ])

        return () => {
            for (const h of handlers) {
                h.unsubscribe()
            }
        }
    }, [dispatch, map, sourceId, features])

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

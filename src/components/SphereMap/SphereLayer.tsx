import { type FC, memo } from "react"
import { PhotoLayer, type PhotoLayerProps } from "@/components/PhotoLayer"
import { assertUnreachable } from "@/lib"
import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
import type { RootState } from "@/store"
import { useAppSelector } from "@/store/hooks"
import type { LayerRenderType } from "@/types"
import { LayerType, SourceType } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl"
import { Layer, type LayerProps } from "react-map-gl/maplibre"
import type { GetImageFunction } from "../PhotoLayer/types"
import { PointLayer } from "./PointLayer"
import type { PointLayerProps } from "./PointLayer"
import { SphereLineStringLayer, type SphereLineStringLayerProps } from "./ShpereLineStringLayer"
import { SpherePolygonLayer, type SpherePolygonLayerProps } from "./SpherePolygonLayer"

function createGetImageFunction({ srcField, valueField }: { srcField: string; valueField: string }): GetImageFunction {
    return properties => {
        const src = properties?.[srcField] as string

        return {
            src,
            value: properties?.[valueField] ?? 0,
        }
    }
}

type SelectTuple<T> = [LayerRenderType, T | null]

const select = createSelector(
    [
        (state: RootState, id: string) => state.layer.items[id],
        (state: RootState, id: string) => {
            const sourceId = state.layer.items[id]?.sourceId
            return sourceId ? state.source.items[sourceId] : undefined
        },
    ],
    (layer, source) => {
        const {
            id: layerId,
            sourceId: rawSourceId,
            sourceLayer,
            type,
            visible,
            color,
            circle,
            heatmap,
            photo,
            extrusion,
            filter,
        } = layer
        const isMaplibreFiltered =
            filter && source?.type === SourceType.MVT && !source.pending && source.format === "pbf"
        const sourceId = filter && !isMaplibreFiltered ? `layer-${layerId}` : rawSourceId
        const userFilter = isMaplibreFiltered ? filter.expression : null
        if (!sourceId || !type) {
            return ["unknown", null] as SelectTuple<object>
        }

        switch (type) {
            case LayerType.Point: {
                const props: PointLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    color,
                    visible,
                    options: circle,
                    userFilter,
                }
                return ["Point", props] as SelectTuple<PointLayerProps>
            }
            case LayerType.Line: {
                const props: SphereLineStringLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    color,
                    visible,
                    thick: false,
                    userFilter,
                }
                return ["LineString", props] as SelectTuple<SphereLineStringLayerProps>
            }
            case LayerType.Polygon: {
                const props: SpherePolygonLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    color,
                    visible,
                    userFilter,
                }
                return ["Polygon", props] as SelectTuple<SpherePolygonLayerProps>
            }
            case LayerType.Extrusion: {
                const h = extrusion?.height ?? 1
                let height: DataDrivenPropertyValueSpecification<number> = extrusion?.height ?? h
                if (extrusion?.heightField) {
                    height = ["*", ["to-number", ["get", extrusion.heightField]], h]
                }
                const b = extrusion?.base ?? 1
                let base: DataDrivenPropertyValueSpecification<number> = extrusion?.base ?? b
                if (extrusion?.baseField) {
                    base = ["*", ["to-number", ["get", extrusion.baseField]], b]
                }
                const opacity = 1
                const props: LayerProps = {
                    id: layerId,
                    source: sourceId,
                    type: "fill-extrusion",
                    layout: {
                        visibility: visibility(visible),
                    },
                    filter: combineFilters(["==", ["geometry-type"], "Polygon"], userFilter),
                    paint: {
                        "fill-extrusion-color": color,
                        "fill-extrusion-opacity": opacity,
                        "fill-extrusion-height": height,
                        "fill-extrusion-base": base,
                    },
                    ...sourceLayerProp(sourceLayer),
                }
                return ["layer", props] as SelectTuple<LayerProps>
            }
            case LayerType.Heatmap: {
                const intensity = heatmap?.intensity ?? 0
                const radius = heatmap?.radius ?? 0
                const props: LayerProps = {
                    id: layerId,
                    source: sourceId,
                    type: "heatmap",
                    layout: {
                        visibility: visibility(visible),
                    },
                    paint: {
                        // Increase the heatmap weight based on frequency and property magnitude
                        // 'heatmap-weight': [
                        //     'interpolate',
                        //     ['linear'],
                        //     ['get', 'mag'],
                        //     0,
                        //     0,
                        //     6,
                        //     1
                        // ],
                        // Increase the heatmap color weight weight by zoom level
                        // heatmap-intensity is a multiplier on top of heatmap-weight
                        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, intensity],
                        // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                        // Begin color ramp at 0-stop with a 0-transparancy color
                        // to create a blur-like effect.
                        "heatmap-color": [
                            "interpolate",
                            ["linear"],
                            ["heatmap-density"],
                            0,
                            "rgba(33,102,172,0)",
                            0.2,
                            "rgb(103,169,207)",
                            0.4,
                            "rgb(209,229,240)",
                            0.6,
                            "rgb(253,219,199)",
                            0.8,
                            "rgb(239,138,98)",
                            1,
                            "rgb(178,24,43)",
                        ],
                        // Adjust the heatmap radius by zoom level
                        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, radius],
                        // Transition from heatmap to circle layer by zoom level
                        // 'heatmap-opacity': [
                        //     'interpolate',
                        //     ['linear'],
                        //     ['zoom'],
                        //     7,
                        //     1,
                        //     9,
                        //     0
                        // ]
                    },
                    ...sourceLayerProp(sourceLayer),
                }
                return ["layer", props] as SelectTuple<LayerProps>
            }
            case LayerType.Raster: {
                const props: LayerProps = {
                    id: layerId,
                    source: sourceId,
                    type: "raster",
                    layout: {
                        visibility: visibility(visible),
                    },
                    ...sourceLayerProp(sourceLayer),
                }
                return ["layer", props] as SelectTuple<LayerProps>
            }
            case LayerType.Photo: {
                let vis = visible
                const srcField = photo?.srcField
                const valueField = photo?.valueField ?? "value"
                if (!srcField) {
                    vis = false
                }
                const props: PhotoLayerProps & { visible: boolean } = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    visible: vis,
                    clusterRadius: photo?.clusterRadius ?? 100,
                    iconSize: 100,
                    iconSizeCluster: 50,
                    iconLayout: photo?.icon ?? "square",
                    getImage: createGetImageFunction({
                        srcField: srcField!,
                        valueField,
                    }),
                }
                return ["photo", props] as SelectTuple<PhotoLayerProps & { visible: boolean }>
            }
            default: {
                assertUnreachable(type)
            }
        }
    },
)

export type SphereLayerProps = {
    id: string
}

export const SphereLayer: FC<SphereLayerProps> = memo(({ id }) => {
    const [type, props] = useAppSelector(state => select(state, id))
    switch (type) {
        case "Point": {
            const p = props as PointLayerProps
            return <PointLayer key={p.sourceId} {...p} />
        }
        case "LineString": {
            const p = props as SphereLineStringLayerProps
            return <SphereLineStringLayer key={p.sourceId} {...p} />
        }
        case "Polygon": {
            const p = props as SpherePolygonLayerProps
            return <SpherePolygonLayer key={p.sourceId} {...p} />
        }
        case "layer": {
            const p = props as LayerProps & { source: string }
            return <Layer key={p.source} {...p} />
        }
        case "photo": {
            const { visible, ...rest } = props as PhotoLayerProps & { visible: boolean }
            if (!visible) {
                return null
            }
            return <PhotoLayer key={(rest as PhotoLayerProps).sourceId} {...(rest as PhotoLayerProps)} />
        }
        case "unknown": {
            return null
        }
        default: {
            assertUnreachable(type)
        }
    }
})

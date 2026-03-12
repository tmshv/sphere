import { useAppSelector } from "@/store/hooks"
import { LayerType } from "@/types"
import { PointLayer } from "./PointLayer"
import { assertUnreachable } from "@/lib"
import { PhotoLayer, PhotoLayerProps } from "@/components/PhotoLayer"
import { SphereLineStringLayer, SphereLineStringLayerProps } from "./ShpereLineStringLayer"
import { SpherePolygonLayer, SpherePolygonLayerProps } from "./SpherePolygonLayer"
import { createSelector } from "@reduxjs/toolkit"
import type { GetImageFunction } from "../PhotoLayer/types"
import type { RootState } from "@/store"
import type { PointLayerProps } from "./PointLayer"
import { Layer, type LayerProps } from "react-map-gl/maplibre"
import { DataDrivenPropertyValueSpecification } from "maplibre-gl"
import { sourceLayerProp, visibility } from "@/lib/maplibre"

function createGetImageFunction({ srcField, valueField }: { srcField: string, valueField: string }): GetImageFunction {
    return properties => {
        const src = properties?.[srcField] as string

        return {
            src,
            value: properties?.[valueField] ?? 0,
        }
    }
}

type Type = "Point" | "LineString" | "Polygon" | "photo" | "layer" | "unknown"

type SelectTuple<T> = [Type, T | null]

const select = createSelector(
    [
        (state: RootState, id: string) => state.layer.items[id],
        // (state: RootState, id: string) => state.source.items[id],
    ],
    (layer) => {
        const { id: layerId, sourceId, sourceLayer, type, visible, color, circle, heatmap, photo, extrusion } = layer
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
                }
                return ["Polygon", props] as SelectTuple<SpherePolygonLayerProps>
            }
            case LayerType.Extrusion: {
                const h = extrusion?.height ?? 1
                let height: DataDrivenPropertyValueSpecification<number> = extrusion?.height ?? h
                if (extrusion?.heightField) {
                    height = ["*", ["to-number", [ "get", extrusion.heightField ]], h]
                }
                const b = extrusion?.base ?? 1
                let base: DataDrivenPropertyValueSpecification<number> = extrusion?.base ?? b
                if (extrusion?.baseField) {
                    base = ["*", ["to-number", [ "get", extrusion.baseField ]], b]
                }
                const opacity = 1
                const props: LayerProps = {
                    id: layerId,
                    source: sourceId,
                    type: "fill-extrusion",
                    layout: {
                        visibility: visibility(visible),
                    },
                    filter: ["==", ["geometry-type"], "Polygon"],
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
                        "heatmap-intensity": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            0, 1,
                            9, intensity,
                        ],
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
                        "heatmap-radius": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            0, 2,
                            9, radius,
                        ],
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

export const SphereLayer: React.FC<SphereLayerProps> = ({ id }) => {
    const [type, props] = useAppSelector(state => select(state, id))
    switch (type) {
        case "Point": {
            return (
                <PointLayer
                    {...props as PointLayerProps}
                />
            )
        }
        case "LineString": {
            return (
                <SphereLineStringLayer
                    {...props as SphereLineStringLayerProps}
                />
            )
        }
        case "Polygon": {
            return (
                <SpherePolygonLayer
                    {...props as SpherePolygonLayerProps}
                />
            )
        }
        case "layer": {
            return (
                <Layer
                    {...props as LayerProps}
                />
            )
        }
        case "photo": {
            const { visible, ...rest } = props as PhotoLayerProps & { visible: boolean }
            if (!visible) {
                return null
            }
            return (
                <PhotoLayer
                    {...rest as PhotoLayerProps}
                />
            )
        }
        case "unknown": {
            return null
        }
        default: {
            assertUnreachable(type)
        }
    }
}

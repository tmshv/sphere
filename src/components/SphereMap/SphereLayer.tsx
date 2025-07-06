import { useAppSelector } from "@/store/hooks"
import { LayerType } from "@/types"
import { PointLayer } from "./PointLayer"
import { assertUnreachable } from "@/lib"
import { PhotoLayer, PhotoLayerProps } from "@/components/PhotoLayer"
import { HeatmapLayer } from "./HeatmapLayer"
import { SphereLineStringLayer, SphereLineStringLayerProps } from "./ShpereLineStringLayer"
import { SpherePolygonLayer, SpherePolygonLayerProps } from "./SpherePolygonLayer"
import { RasterLayer } from "./RasterLayer"
import ExtrusionLayer from "./extrustion-layer"
import { createSelector } from "@reduxjs/toolkit"
import type { GetImageFunction } from "../PhotoLayer/types"
import type { RootState } from "@/store"
import type { PointLayerProps } from "./PointLayer"
import type { RasterLayerProps } from "./RasterLayer"
import type { HeatmapLayerProps } from "./HeatmapLayer"
import type { ExtrusionLayerProps } from "./extrustion-layer"

function createGetImageFunction({ srcField, valueField }: { srcField: string, valueField: string }): GetImageFunction {
    return propetries => {
        const src = propetries![srcField] as string

        return {
            src,
            value: propetries![valueField] ?? 0,
        }
    }
}

type SelectTuple<T> = [LayerType, T | null]

const select = createSelector(
    [
        (state: RootState, id: string) => state.layer.items[id],
        // (state: RootState, id: string) => state.source.items[id],
    ],
    (layer) => {
        const { id: layerId, sourceId, sourceLayer, type, visible, color, circle, heatmap, photo, extrusion } = layer
        if (!sourceId || !type) {
            return [type, null] as SelectTuple<object>
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
                return [type, props] as SelectTuple<PointLayerProps>
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
                return [type, props] as SelectTuple<SphereLineStringLayerProps>
            }
            case LayerType.Polygon: {
                const props: SpherePolygonLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    color,
                    visible,
                }
                return [type, props] as SelectTuple<SpherePolygonLayerProps>
            }
            case LayerType.Extrusion: {
                const h = extrusion?.height ?? 1
                let height: ExtrusionLayerProps["height"] = extrusion?.height ?? h
                if (extrusion?.heightField) {
                    height = ["*", ["to-number", [ "get", extrusion.heightField ]], h]
                }
                const b = extrusion?.base ?? 1
                let base: ExtrusionLayerProps["base"] = extrusion?.base ?? b
                if (extrusion?.baseField) {
                    base = ["*", ["to-number", [ "get", extrusion.baseField ]], b]
                }
                const props: ExtrusionLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    visible,
                    opacity: 1,
                    color,
                    base,
                    height,
                }
                return [type, props] as SelectTuple<ExtrusionLayerProps>
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
                return [type, props] as SelectTuple<PhotoLayerProps & { visible: boolean }>
            }
            case LayerType.Heatmap: {
                const props: HeatmapLayerProps = {
                    layerId,
                    sourceId,
                    visible,
                    intensity: heatmap?.intensity ?? 0,
                    radius: heatmap?.radius ?? 0,
                }
                return [type, props] as SelectTuple<HeatmapLayerProps>
            }
            case LayerType.Raster: {
                const props: RasterLayerProps = {
                    layerId,
                    sourceId,
                    sourceLayer,
                    visible,
                }
                return [type, props] as SelectTuple<RasterLayerProps>
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
    if (!type) {
        return null
    }

    switch (type) {
        case LayerType.Point: {
            return (
                <PointLayer
                    {...props as PointLayerProps}
                />
            )
        }
        case LayerType.Line: {
            return (
                <SphereLineStringLayer
                    {...props as SphereLineStringLayerProps}
                />
            )
        }
        case LayerType.Polygon: {
            return (
                <SpherePolygonLayer
                    {...props as SpherePolygonLayerProps}
                />
            )
        }
        case LayerType.Extrusion: {
            return (
                <ExtrusionLayer
                    {...props as ExtrusionLayerProps}
                />
            )
        }
        case LayerType.Heatmap: {
            return (
                <HeatmapLayer
                    {...props as HeatmapLayerProps}
                />
            )
        }
        case LayerType.Raster: {
            return (
                <RasterLayer
                    {...props as RasterLayerProps}
                />
            )
        }
        case LayerType.Photo: {
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
        default: {
            assertUnreachable(type)
        }
    }
}

import { useAppSelector } from "@/store/hooks"
import { LayerType } from "@/types"
import { FillLayer } from "./FillLayer"
import { LineStringLayer } from "./LineStringLayer"
import { PointLayer } from "./PointLayer"
import { assertUnreachable } from "@/lib"
import { PhotoLayer } from "@/components/PhotoLayer"
import { HeatmapLayer } from "./HeatmapLayer"
import { SphereLineStringLayer } from "./ShpereLineStringLayer"
import { SpherePolygonLayer } from "./SpherePolygonLayer"
import { RasterLayer } from "./RasterLayer"
import type { GetImageFunction } from "../PhotoLayer/types"

function createGetImageFunction({ srcField, valueField }: { srcField: string, valueField: string }): GetImageFunction {
    return propetries => {
        const src = propetries![srcField] as string

        return {
            src,
            value: propetries![valueField] ?? 0,
        }
    }
}

export type SphereLayerProps = {
    id: string
}

export const SphereLayer: React.FC<SphereLayerProps> = ({ id }) => {
    const { id: layerId, sourceId, sourceLayer, type, visible, color, circle, heatmap, photo } = useAppSelector(state => state.layer.items[id])
    if (!sourceId || !type) {
        return null
    }

    switch (type) {
        case LayerType.Point: {
            return (
                <PointLayer
                    layerId={layerId}
                    sourceId={sourceId}
                    sourceLayer={sourceLayer}
                    color={color}
                    options={circle}
                    visible={visible}
                />
            )
        }
        case LayerType.Line: {
            if (sourceLayer) {
                return (
                    <LineStringLayer
                        layerId={layerId}
                        sourceId={sourceId}
                        sourceLayer={sourceLayer}
                        color={color}
                        visible={visible}
                    />
                )
            }
            return (
                <SphereLineStringLayer
                    layerId={layerId}
                    sourceId={sourceId}
                    color={color}
                    visible={visible}
                    thick={false}
                />
            )
        }
        case LayerType.Polygon: {
            if (sourceLayer) {
                return (
                    <FillLayer
                        layerId={layerId}
                        sourceId={sourceId}
                        sourceLayer={sourceLayer}
                        color={color}
                        visible={visible}
                    />
                )
            }
            return (
                <SpherePolygonLayer
                    layerId={layerId}
                    sourceId={sourceId}
                    color={color}
                    visible={visible}
                />
            )
        }
        case LayerType.Photo: {
            const srcField = photo?.srcField
            const valueField = photo?.valueField ?? "value"
            if (!srcField) {
                return null
            }
            return !visible ? null : (
                <PhotoLayer
                    layerId={layerId}
                    sourceId={sourceId}
                    getImage={createGetImageFunction({
                        srcField,
                        valueField,
                    })}
                    clusterRadius={50}
                    iconSize={100}
                    iconSizeCluster={50}
                    iconLayout={photo!.icon}
                />
            )
        }
        case LayerType.Heatmap: {
            return (
                <HeatmapLayer
                    layerId={layerId}
                    sourceId={sourceId}
                    options={heatmap!}
                    visible={visible}
                />
            )
        }
        case LayerType.Raster: {
            return (
                <RasterLayer
                    layerId={layerId}
                    sourceId={sourceId}
                    visible={visible}
                />
            )
        }
        default: {
            assertUnreachable(type)
        }
    }
}

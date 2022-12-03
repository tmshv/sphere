import { useAppSelector } from "../../store/hooks"
import { LayerType } from "@/types"
import { FillLayer } from "./FillLayer"
import { LineStringLayer } from "./LineStringLayer"
import { PointLayer } from "./PointLayer"
import { assertUnreachable } from "@/lib"
import { GetImageFunction, PhotoLayer } from "./PhotoLayer"
import { HeatmapLayer } from "./HeatmapLayer"
import { SphereLineStringLayer } from "./ShpereLineStringLayer"
import { SpherePolygonLayer } from "./SpherePolygonLayer"

const getImage: GetImageFunction = p => {
    const srcField = "thumbnail"
    const valueField = "score"

    const src = p[srcField] as string

    return {
        src,
        value: p[valueField] ?? 0,
    }
}

export type SphereLayerProps = {
    id: string
}

export const SphereLayer: React.FC<SphereLayerProps> = ({ id }) => {
    const { id: layerId, sourceId, sourceLayer, type, visible, color, circle, heatmap } = useAppSelector(state => state.layer.items[id])
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
            return !visible ? null : (
                <PhotoLayer
                    layerId={layerId}
                    sourceId={sourceId}
                    getImage={getImage}
                    clusterRadius={50}
                    iconSize={50}
                    iconSizeCluster={50}
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
        default: {
            assertUnreachable(type)
        }
    }
}

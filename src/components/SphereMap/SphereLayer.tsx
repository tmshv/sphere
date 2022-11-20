import { useAppSelector } from "../../store/hooks";
import { LayerType } from "@/types";
import { PolygonLayer } from "./PolygonLayer";
import { LineStringLayer } from "./LineStringLayer";
import { PointLayer } from "./PointLayer";
import { assertUnreachable } from "@/lib";
import { GetImageFunction, PhotoLayer } from "./PhotoLayer";
import { HeatmapLayer } from "./HeatmapLayer";

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
    const { sourceId, type, visible, color, circle, heatmap } = useAppSelector(state => state.layer.items[id])
    if (!sourceId || !type) {
        return null
    }

    switch (type) {
        case LayerType.Point: {
            return (
                <PointLayer
                    sourceId={sourceId}
                    color={color}
                    options={circle}
                    visible={visible}
                />
            )
        }
        case LayerType.Line: {
            return (
                <LineStringLayer
                    thick={false}
                    sourceId={sourceId}
                    color={color}
                    visible={visible}
                />
            )
        }
        case LayerType.Polygon: {
            return (
                <PolygonLayer
                    sourceId={sourceId}
                    color={color}
                    visible={visible}
                />
            )
        }
        case LayerType.Photo: {
            return !visible ? null : (
                <PhotoLayer
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

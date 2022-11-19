import { useAppSelector } from "../../store/hooks";
import { LayerType } from "@/types";
import { PolygonLayer } from "./PolygonLayer";
import { LineStringLayer } from "./LineStringLayer";
import { PointLayer } from "./PointLayer";
import { assertUnreachable } from "@/lib";

export type SphereLayerProps = {
    id: string
}

export const SphereLayer: React.FC<SphereLayerProps> = ({ id }) => {
    const { sourceId, type } = useAppSelector(state => state.layer.items[id])
    if (!sourceId || !type) {
        return null
    }

    switch (type) {
        case LayerType.Point: {
            return (
                <PointLayer
                    sourceId={sourceId}
                />
            )
        }
        case LayerType.Line: {
            return (
                <LineStringLayer
                    sourceId={sourceId}
                />
            )
        }
        case LayerType.Polygon: {
            return (
            <PolygonLayer
                sourceId={sourceId}
            />
            )
        }
        default: {
            assertUnreachable(type)
        }
    }
}

import { useAppSelector } from "../../store/hooks";
import { LayerType } from "@/types";
import { PolygonLayer } from "./PolygonLayer";
import { LineStringLayer } from "./LineStringLayer";
import { PointLayer } from "./PointLayer";

export type SphereLayerProps = {
    id: string
}

export const SphereLayer: React.FC<SphereLayerProps> = ({ id }) => {
    const { sourceId, type } = useAppSelector(state => state.layer.items[id])

    return (
        <>
            {!(type === LayerType.Polygon) ? null : (
                <PolygonLayer
                    sourceId={sourceId}
                />
            )}
            {!(type === LayerType.Line) ? null : (
                <LineStringLayer
                    sourceId={sourceId}
                />
            )}
            {!(type === LayerType.Point) ? null : (
                <PointLayer
                    sourceId={sourceId}
                />
            )}
        </>
    )
}

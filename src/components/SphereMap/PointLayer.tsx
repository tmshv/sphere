import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { CirclePaint } from "mapbox-gl";

export type PointLayerProps = {
    sourceId: string
    color: string
}

export const PointLayer: React.FC<PointLayerProps> = ({ sourceId, color }) => {
    const circle = useMemo(() => {
        const circle: CirclePaint = {
            "circle-color": color,
            "circle-radius": 4,
            "circle-stroke-color": "white",
            "circle-stroke-width": 1,
        }
        return circle
    }, [color])

    return (
        <Layer
            id={`${sourceId}-circles`}
            source={sourceId}
            type={"circle"}
            paint={circle}
        />
    )
}

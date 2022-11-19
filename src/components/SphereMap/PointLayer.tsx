import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { CirclePaint } from "mapbox-gl";

export type PointLayerProps = {
    sourceId: string
    color: string
    options?: {
        maxRadius: number
        minRadius: number
    }
}

export const PointLayer: React.FC<PointLayerProps> = ({ sourceId, color, options }) => {
    const circle = useMemo(() => {
        const circle: CirclePaint = {
            "circle-color": color,
            "circle-radius": options?.maxRadius ?? 4,
            "circle-stroke-color": "white",
            "circle-stroke-width": 1,
        }
        return circle
    }, [color, options])

    return (
        <Layer
            id={`${sourceId}-circles`}
            source={sourceId}
            type={"circle"}
            paint={circle}
        />
    )
}

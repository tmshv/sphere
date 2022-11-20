import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { CirclePaint } from "mapbox-gl";

export type PointLayerProps = {
    layerId: string
    sourceId: string
    color: string
    visible: boolean
    options?: {
        maxRadius: number
        minRadius: number
    }
}

export const PointLayer: React.FC<PointLayerProps> = ({ layerId, sourceId, color, options, visible }) => {
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
            id={layerId}
            source={sourceId}
            type={"circle"}
            paint={circle}
            layout={{
                visibility: visible ? "visible" : "none",
            }}
        />
    )
}

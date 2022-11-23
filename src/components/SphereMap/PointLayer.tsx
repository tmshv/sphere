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
    const [circle, selected] = useMemo(() => {
        const radius = options?.maxRadius ?? 4
        const circle: CirclePaint = {
            "circle-color": color,
            "circle-radius": radius,
            "circle-stroke-color": "white",
            "circle-stroke-width": 1,
        }
        const selected: CirclePaint = {
            ...circle,
            "circle-radius": radius,
            "circle-stroke-width": 2,
        }
        return [circle, selected]
    }, [color, options])

    return (
        <>
            <Layer
                id={layerId}
                source={sourceId}
                type={"circle"}
                paint={circle}
                layout={{
                    visibility: visible ? "visible" : "none",
                }}
                filter={['==', ['geometry-type'], 'Point']}
            />
            <Layer
                id={`${layerId}-selected`}
                source={sourceId}
                type={"circle"}
                paint={selected}
                layout={{
                    visibility: visible ? "visible" : "none",
                }}
                filter={['in', 'id', '']}
            />
        </>
    )
}

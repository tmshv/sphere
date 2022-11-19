import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { LinePaint } from "mapbox-gl";

export type LineStringLayerProps = {
    sourceId: string
    color: string
    visible: boolean
}

export const LineStringLayer: React.FC<LineStringLayerProps> = ({ sourceId, color, visible }) => {
    const [line0, line1] = useMemo(() => {
        const line0: LinePaint = {
            "line-color": "white",
            "line-width": 3,
        }
        const line1: LinePaint = {
            "line-color": color,
            "line-width": 1,
            "line-dasharray": [4, 1],
        }

        return [line0, line1]
    }, [color])

    return (
        <>
            <Layer
                id={`${sourceId}-lines-0`}
                source={sourceId}
                type={"line"}
                paint={line0}
                layout={{
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={`${sourceId}-lines-1`}
                source={sourceId}
                type={"line"}
                paint={line1}
                layout={{
                    visibility: visible ? "visible" : "none"
                }}
            />
        </>
    )
}

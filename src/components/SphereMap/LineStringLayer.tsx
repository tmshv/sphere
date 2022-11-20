import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { LinePaint } from "mapbox-gl";

export type LineStringLayerProps = {
    sourceId: string
    color: string
    visible: boolean
    thick: boolean
}

export const LineStringLayer: React.FC<LineStringLayerProps> = ({ sourceId, color, visible, thick }) => {
    const [line0, line1] = useMemo(() => {
        const line0: LinePaint = {
            "line-color": "#fff",
            "line-width": thick ? 4 : 3,
        }
        const line1: LinePaint = {
            "line-color": color,
            "line-width": thick ? 2 : 1,
        }

        return [line0, line1]
    }, [color, thick])

    return (
        <>
            <Layer
                id={`${sourceId}-lines-0`}
                source={sourceId}
                type={"line"}
                paint={line0}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={`${sourceId}-lines-1`}
                source={sourceId}
                type={"line"}
                paint={line1}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none"
                }}
            />
        </>
    )
}

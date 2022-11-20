import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { LinePaint } from "mapbox-gl";

export type LineStringLayerProps = {
    layerId: string
    sourceId: string
    color: string
    visible: boolean
    thick: boolean
}

export const LineStringLayer: React.FC<LineStringLayerProps> = ({ layerId, sourceId, color, visible, thick }) => {
    const [outline, line] = useMemo(() => {
        const outline: LinePaint = {
            "line-color": "#fff",
            "line-width": thick ? 4 : 3,
        }
        const line: LinePaint = {
            "line-color": color,
            "line-width": thick ? 2 : 1,
        }

        return [outline, line]
    }, [color, thick])

    return (
        <>
            <Layer
                id={`${layerId}-outline`}
                source={sourceId}
                type={"line"}
                paint={outline}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={layerId}
                source={sourceId}
                type={"line"}
                paint={line}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none"
                }}
            />
        </>
    )
}

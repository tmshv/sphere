import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { FillPaint, LinePaint } from "mapbox-gl";

export type PolygonLayerProps = {
    layerId: string
    sourceId: string
    color: string
    visible: boolean
}

export const PolygonLayer: React.FC<PolygonLayerProps> = ({ layerId, sourceId, color, visible }) => {
    const [fill, outline0, outline1, selected] = useMemo(() => {
        const fill: FillPaint = {
            "fill-color": color,
            "fill-opacity": 0.25,
        }
        const outline0: LinePaint = {
            "line-color": "white",
            "line-width": 3,
        }
        const outline1: LinePaint = {
            "line-color": color,
            "line-width": 1,
        }
        const selected: LinePaint = {
            "line-color": "white",
            "line-width": 3,
        }

        return [fill, outline0, outline1, selected]
    }, [color])

    return (
        <>
            <Layer
                id={`${layerId}`}
                source={sourceId}
                type={"fill"}
                paint={fill}
                layout={{
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={`${layerId}-outline-0`}
                source={sourceId}
                type={"line"}
                paint={outline0}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={`${layerId}-outline-1`}
                source={sourceId}
                type={"line"}
                paint={outline1}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={`${layerId}-selected`}
                source={sourceId}
                type={"line"}
                paint={selected}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none"
                }}
                filter={['in', 'id', '']}
            />
        </>
    )
}

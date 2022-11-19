import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { FillPaint, LinePaint } from "mapbox-gl";

export type PolygonLayerProps = {
    sourceId: string
    color: string
    visible: boolean
}

export const PolygonLayer: React.FC<PolygonLayerProps> = ({ sourceId, color, visible }) => {
    const [fill, outline0, outline1] = useMemo(() => {
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

        return [fill, outline0, outline1]
    }, [color])

    return (
        <>
            <Layer
                id={`${sourceId}-polygons-fill`}
                source={sourceId}
                type={"fill"}
                paint={fill}
                layout={{
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={`${sourceId}-polygons-outline-0`}
                source={sourceId}
                type={"line"}
                paint={outline0}
                layout={{
                    visibility: visible ? "visible" : "none"
                }}
            />
            <Layer
                id={`${sourceId}-polygons-outline-1`}
                source={sourceId}
                type={"line"}
                paint={outline1}
                layout={{
                    visibility: visible ? "visible" : "none"
                }}
            />
        </>
    )
}

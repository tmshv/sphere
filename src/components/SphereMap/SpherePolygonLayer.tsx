import { Layer } from "react-map-gl"
import { useMemo } from "react"
import { FillPaint, LinePaint } from "mapbox-gl"

export type SpherePolygonLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
}

export const SpherePolygonLayer: React.FC<SpherePolygonLayerProps> = ({ layerId, sourceId, sourceLayer, color, visible }) => {
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
                    visibility: visible ? "visible" : "none",
                }}
                filter={["==", ["geometry-type"], "Polygon"]}
            />
            <Layer
                id={`${layerId}-outline-0`}
                source={sourceId}
                type={"line"}
                paint={outline0}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none",
                }}
                filter={["==", ["geometry-type"], "Polygon"]}
            />
            <Layer
                id={`${layerId}-outline-1`}
                source={sourceId}
                type={"line"}
                paint={outline1}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none",
                }}
                filter={["==", ["geometry-type"], "Polygon"]}
            />
            <Layer
                id={`${layerId}-selected`}
                source={sourceId}
                type={"line"}
                paint={selected}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none",
                }}
                filter={["in", "id", ""]}
            />
        </>
    )
}

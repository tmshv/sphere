import { FEATURE_HIGHLIGHT_COLOR } from "@/const"
import { sourceLayerProp, visibility } from "@/lib/maplibre"
import type { FillLayerSpecification, LineLayerSpecification } from "maplibre-gl"
import { useMemo } from "react"
import { Layer } from "react-map-gl/maplibre"

type FillPaint = FillLayerSpecification["paint"]
type LinePaint = LineLayerSpecification["paint"]

export type SpherePolygonLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
}

export const SpherePolygonLayer: React.FC<SpherePolygonLayerProps> = ({
    layerId,
    sourceId,
    sourceLayer,
    color,
    visible,
}) => {
    const [fill, outline0, outline1] = useMemo(() => {
        const fill: FillPaint = {
            "fill-color": ["case", ["boolean", ["feature-state", "selected"], false], FEATURE_HIGHLIGHT_COLOR, color],
            "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.15, 0.15],
            "fill-outline-color": "black",
        }
        const outline0: LinePaint = {
            // "line-color": ["case", ["boolean", ["feature-state", "selected"], false], FEATURE_HIGHLIGHT_COLOR, "white"],
            "line-color": "white",
            "line-width": 1,
            "line-offset": -1,
        }
        const outline1: LinePaint = {
            "line-color": ["case", ["boolean", ["feature-state", "selected"], false], FEATURE_HIGHLIGHT_COLOR, color],
            "line-width": 1, //["case", ["boolean", ["feature-state", "selected"], false], 3, 1],
        }

        return [fill, outline0, outline1]
    }, [color])

    return (
        <>
            <Layer
                id={`${layerId}`}
                source={sourceId}
                type={"fill"}
                paint={fill}
                layout={{
                    visibility: visibility(visible),
                }}
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                {...sourceLayerProp(sourceLayer)}
            />
            <Layer
                id={`${layerId}-outline-0`}
                source={sourceId}
                type={"line"}
                paint={outline0}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visibility(visible),
                }}
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                {...sourceLayerProp(sourceLayer)}
            />
            <Layer
                id={`${layerId}-outline-1`}
                source={sourceId}
                type={"line"}
                paint={outline1}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visibility(visible),
                }}
                filter={["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]]}
                {...sourceLayerProp(sourceLayer)}
            />
        </>
    )
}

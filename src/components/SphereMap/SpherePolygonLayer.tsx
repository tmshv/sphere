import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
import type { FillLayerSpecification, FilterSpecification, LineLayerSpecification } from "maplibre-gl"
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
    filter?: FilterSpecification
}

export const SpherePolygonLayer: React.FC<SpherePolygonLayerProps> = ({
    layerId,
    sourceId,
    sourceLayer,
    color,
    visible,
    filter,
}) => {
    const [fill, outline0, outline1, selected] = useMemo(() => {
        const fill: FillPaint = {
            "fill-color": color,
            "fill-opacity": 0.25,
        }
        const outline0: LinePaint = {
            "line-color": "white",
            "line-width": 1,
            "line-offset": -1,
            // for double size
            // "line-width": 3,
            // "line-offset": 0,
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
                filter={combineFilters(
                    ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
                    ...(filter ? [filter] : []),
                )}
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
                filter={combineFilters(
                    ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
                    ...(filter ? [filter] : []),
                )}
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
                filter={combineFilters(
                    ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
                    ...(filter ? [filter] : []),
                )}
                {...sourceLayerProp(sourceLayer)}
            />
            <Layer
                id={`${layerId}-selected`}
                source={sourceId}
                type={"line"}
                paint={selected}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visibility(visible),
                }}
                filter={combineFilters(["in", "id", ""], ...(filter ? [filter] : []))}
                {...sourceLayerProp(sourceLayer)}
            />
        </>
    )
}

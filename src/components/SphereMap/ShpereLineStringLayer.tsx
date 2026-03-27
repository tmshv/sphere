import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
import type { LineLayerSpecification } from "maplibre-gl"
import { useMemo } from "react"
import { Layer } from "react-map-gl/maplibre"

type LinePaint = LineLayerSpecification["paint"]

export type SphereLineStringLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    thick: boolean
    userFilter?: unknown[] | null
}

export const SphereLineStringLayer: React.FC<SphereLineStringLayerProps> = ({
    layerId,
    sourceId,
    sourceLayer,
    color,
    visible,
    thick,
    userFilter,
}) => {
    const [outline, line, selected] = useMemo(() => {
        const outline: LinePaint = {
            "line-color": "#fff",
            "line-width": thick ? 4 : 3,
        }
        const line: LinePaint = {
            "line-color": color,
            "line-width": thick ? 2 : 1,
        }
        const selected: LinePaint = {
            "line-color": "white",
            "line-width": thick ? 6 : 3,
        }

        return [outline, line, selected]
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
                    visibility: visibility(visible),
                }}
                filter={combineFilters(
                    ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
                    userFilter,
                )}
                {...sourceLayerProp(sourceLayer)}
            />
            <Layer
                id={layerId}
                source={sourceId}
                type={"line"}
                paint={line}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visibility(visible),
                }}
                filter={combineFilters(
                    ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
                    userFilter,
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
                filter={["in", "id", ""]}
                {...sourceLayerProp(sourceLayer)}
            />
        </>
    )
}

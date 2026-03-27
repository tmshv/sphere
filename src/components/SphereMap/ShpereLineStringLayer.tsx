import { FEATURE_HIGHLIGHT_COLOR } from "@/const"
import { sourceLayerProp, visibility } from "@/lib/maplibre"
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
}

export const SphereLineStringLayer: React.FC<SphereLineStringLayerProps> = ({
    layerId,
    sourceId,
    sourceLayer,
    color,
    visible,
    thick,
}) => {
    const [outline, line] = useMemo(() => {
        const outline: LinePaint = {
            // "line-color": ["case", ["boolean", ["feature-state", "selected"], false], color, "#fff"],
            "line-color": "white",
            "line-width": thick ? 4 : 3,
        }
        const line: LinePaint = {
            "line-color": ["case", ["boolean", ["feature-state", "selected"], false], FEATURE_HIGHLIGHT_COLOR, color],
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
                    visibility: visibility(visible),
                }}
                filter={["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]]}
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
                filter={["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]]}
                {...sourceLayerProp(sourceLayer)}
            />
        </>
    )
}

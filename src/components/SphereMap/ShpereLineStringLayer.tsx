import { Layer } from "react-map-gl/maplibre"
import { useMemo } from "react"
import { LineLayerSpecification } from "maplibre-gl"
import { sourceLayerProp, visibility } from "@/lib/maplibre"

type LinePaint = LineLayerSpecification["paint"]

export type SphereLineStringLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    thick: boolean
}

export const SphereLineStringLayer: React.FC<SphereLineStringLayerProps> = ({ layerId, sourceId, sourceLayer, color, visible, thick }) => {
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
                filter={["==", ["geometry-type"], "LineString"]}
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
                filter={["==", ["geometry-type"], "LineString"]}
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

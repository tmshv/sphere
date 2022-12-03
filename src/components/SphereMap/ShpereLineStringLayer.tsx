import { Layer } from "react-map-gl"
import { useMemo } from "react"
import { LinePaint } from "mapbox-gl"

export type SphereLineStringLayerProps = {
    layerId: string
    sourceId: string
    color: string
    visible: boolean
    thick: boolean
}

export const SphereLineStringLayer: React.FC<SphereLineStringLayerProps> = ({ layerId, sourceId, color, visible, thick }) => {
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
                    visibility: visible ? "visible" : "none",
                }}
                filter={["==", ["geometry-type"], "LineString"]}
            />
            <Layer
                id={layerId}
                source={sourceId}
                type={"line"}
                paint={line}
                layout={{
                    "line-cap": "round",
                    "line-join": "round",
                    visibility: visible ? "visible" : "none",
                }}
                filter={["==", ["geometry-type"], "LineString"]}
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
                filter={["in", "in", ""]}
            />
        </>
    )
}

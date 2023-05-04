import { Layer } from "react-map-gl"
import { useMemo } from "react"
import { LinePaint } from "mapbox-gl"

export type LineStringLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
}

export const LineStringLayer: React.FC<LineStringLayerProps> = ({ layerId, sourceId, sourceLayer, color, visible }) => {
    const line = useMemo(() => {
        const line: LinePaint = {
            "line-color": color,
            "line-width": 1,
        }
        return line
    }, [color])

    return (
        <>
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
                {...{
                    "source-layer": sourceLayer,
                }}
            />
        </>
    )
}

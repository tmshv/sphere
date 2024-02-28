import { Layer } from "react-map-gl/maplibre"

export type LineStringLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
}

export const LineStringLayer: React.FC<LineStringLayerProps> = ({ layerId, sourceId, sourceLayer, color, visible }) => (
    <Layer
        id={layerId}
        source={sourceId}
        type={"line"}
        paint={{
            "line-color": color,
            "line-width": 1,
        }}
        layout={{
            "line-cap": "round",
            "line-join": "round",
            visibility: visible ? "visible" : "none",
        }}
        {...{
            "source-layer": sourceLayer,
        }}
    />
)

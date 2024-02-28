import { Layer } from "react-map-gl/maplibre"

export type FillLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
}

export const FillLayer: React.FC<FillLayerProps> = ({ layerId, sourceId, sourceLayer, color, visible }) => (
    <Layer
        id={layerId}
        source={sourceId}
        type={"fill"}
        paint={{
            "fill-color": color,
            "fill-opacity": 0.25,
        }}
        layout={{
            visibility: visible ? "visible" : "none",
        }}
        filter={["==", ["geometry-type"], "Polygon"]}
        {...{
            "source-layer": sourceLayer,
        }}
    />
)

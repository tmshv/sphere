import { Layer } from "react-map-gl/maplibre"

export type ExtrusionLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    height: number
    visible: boolean
}

function p(sourceLayer?: string): object {
    if (!sourceLayer) {
        return {}
    }
    return {
        "source-layer": sourceLayer,
    }
}

export default function ExtrusionLayer({ layerId, sourceId, sourceLayer, color, height, visible }: ExtrusionLayerProps) {
    return (
        <Layer
            id={layerId}
            source={sourceId}
            type={"fill-extrusion"}
            paint={{
                "fill-extrusion-color": color,
                "fill-extrusion-opacity": 0.95,
                "fill-extrusion-height": height,
            }}
            layout={{
                visibility: visible ? "visible" : "none",
            }}
            filter={["==", ["geometry-type"], "Polygon"]}
            {...p(sourceLayer)}
        />
    )
}

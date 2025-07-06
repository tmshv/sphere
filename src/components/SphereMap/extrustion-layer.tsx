import type { DataDrivenPropertyValueSpecification, PropertyValueSpecification } from "maplibre-gl"
import { Layer } from "react-map-gl/maplibre"

export type ExtrusionLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: DataDrivenPropertyValueSpecification<string>
    opacity: PropertyValueSpecification<number>
    base: DataDrivenPropertyValueSpecification<number>
    height: DataDrivenPropertyValueSpecification<number>
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

export default function ExtrusionLayer({ layerId, sourceId, sourceLayer, color, opacity, base, height, visible }: ExtrusionLayerProps) {
    return (
        <Layer
            id={layerId}
            source={sourceId}
            type={"fill-extrusion"}
            paint={{
                "fill-extrusion-color": color,
                "fill-extrusion-opacity": opacity,
                "fill-extrusion-height": height,
                "fill-extrusion-base": base,
            }}
            layout={{
                visibility: visible ? "visible" : "none",
            }}
            filter={["==", ["geometry-type"], "Polygon"]}
            {...p(sourceLayer)}
        />
    )
}

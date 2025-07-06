import { Layer } from "react-map-gl/maplibre"

export type RasterLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    visible: boolean
}

export const RasterLayer: React.FC<RasterLayerProps> = ({ layerId, sourceId, sourceLayer, visible }) => {
    return (
        <Layer
            id={`${layerId}-raster`}
            source={sourceId}
            type={"raster"}
            layout={{
                visibility: visible ? "visible" : "none",
            }}
            {...{
                "source-layer": sourceLayer,
            }}
        />
    )
}

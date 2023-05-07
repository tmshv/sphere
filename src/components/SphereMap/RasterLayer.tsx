import { Layer } from "react-map-gl"

export type RasterLayerProps = {
    layerId: string
    sourceId: string
    visible: boolean
}

export const RasterLayer: React.FC<RasterLayerProps> = ({ layerId, sourceId, visible }) => {
    return (
        <Layer
            id={`${layerId}-raster`}
            source={sourceId}
            type={"raster"}
            layout={{
                visibility: visible ? "visible" : "none",
            }}
        />
    )
}

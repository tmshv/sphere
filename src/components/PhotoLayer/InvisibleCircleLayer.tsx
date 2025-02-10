import { Layer } from "react-map-gl/maplibre"

export type InvisibleCircleLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
}

export const InvisibleCircleLayer: React.FC<InvisibleCircleLayerProps> = ({ sourceId, sourceLayer, layerId }) => {
    return (
        <Layer
            id={layerId}
            source={sourceId}
            type="circle"
            paint={{
                "circle-color": "#00000000",
                "circle-radius": 1,
                "circle-stroke-width": 0,
                "circle-stroke-color": "#00000000",
            }}
            layout={{
                visibility: "visible",
            }}
            source-layer={sourceLayer}
        />
    )
}

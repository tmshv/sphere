import { combineFilters } from "@/lib/maplibre"
import type { FilterSpecification } from "maplibre-gl"
import { Layer } from "react-map-gl/maplibre"

export type InvisibleCircleLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    filter?: FilterSpecification
}

export const InvisibleCircleLayer: React.FC<InvisibleCircleLayerProps> = ({
    sourceId,
    sourceLayer,
    layerId,
    filter,
}) => {
    return (
        <Layer
            id={layerId}
            source={sourceId}
            type="circle"
            filter={combineFilters(["==", ["geometry-type"], "Point"], ...(filter ? [filter] : []))}
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

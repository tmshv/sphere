import { FEATURE_HIGHLIGHT_COLOR } from "@/const"
import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
import type { CircleLayerSpecification, FilterSpecification } from "maplibre-gl"
import { useMemo } from "react"
import { Layer } from "react-map-gl/maplibre"

type CirclePaint = CircleLayerSpecification["paint"]

export type PointLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    filter?: FilterSpecification
    options?: {
        maxRadius: number
        minRadius: number
    }
}

export const PointLayer: React.FC<PointLayerProps> = ({
    layerId,
    sourceId,
    sourceLayer,
    color,
    options,
    visible,
    filter,
}) => {
    const circle = useMemo(() => {
        const radius = options?.maxRadius ?? 4
        const circle: CirclePaint = {
            "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], FEATURE_HIGHLIGHT_COLOR, color],
            "circle-radius": radius,
            "circle-stroke-color": "white",
            "circle-stroke-width": 1,
        }
        return circle
    }, [color, options])

    return (
        <Layer
            id={layerId}
            source={sourceId}
            type="circle"
            paint={circle}
            layout={{
                visibility: visibility(visible),
            }}
            filter={combineFilters(
                ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]],
                ...(filter ? [filter] : []),
            )}
            {...sourceLayerProp(sourceLayer)}
        />
    )
}

import { FEATURE_HIGHLIGHT_COLOR } from "@/const"
import { combineFilters, sourceLayerProp, visibility } from "@/lib/maplibre"
import type { CircleLayerSpecification, FilterSpecification } from "maplibre-gl"
import { useMemo } from "react"
import { Layer } from "react-map-gl/maplibre"

type CirclePaint = CircleLayerSpecification["paint"]

const STROKE_WIDTH = 1
const NO_STROKE_WIDTH = 0

export type PointLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    // Draw the white stroke around the circle
    outline?: boolean
    filter?: FilterSpecification
    // Layer to draw below; absent means on top
    beforeId?: string
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
    outline = true,
    filter,
    beforeId,
}) => {
    const circle = useMemo(() => {
        const radius = options?.maxRadius ?? 4
        const circle: CirclePaint = {
            "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], FEATURE_HIGHLIGHT_COLOR, color],
            "circle-radius": radius,
            "circle-stroke-color": "white",
            "circle-stroke-width": outline ? STROKE_WIDTH : NO_STROKE_WIDTH,
        }
        return circle
    }, [color, options, outline])

    return (
        <Layer
            id={layerId}
            beforeId={beforeId}
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

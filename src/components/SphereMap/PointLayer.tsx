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
    const [circle, selected] = useMemo(() => {
        const radius = options?.maxRadius ?? 4
        const circle: CirclePaint = {
            "circle-color": color,
            "circle-radius": radius,
            "circle-stroke-color": "white",
            "circle-stroke-width": 1,
        }
        const selected: CirclePaint = {
            ...circle,
            "circle-radius": radius,
            "circle-stroke-width": 2,
        }
        return [circle, selected]
    }, [color, options])

    return (
        <>
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
            <Layer
                id={`${layerId}-selected`}
                source={sourceId}
                type={"circle"}
                paint={selected}
                layout={{
                    visibility: visibility(visible),
                }}
                filter={combineFilters(["in", "id", ""], ...(filter ? [filter] : []))}
                {...sourceLayerProp(sourceLayer)}
            />
        </>
    )
}

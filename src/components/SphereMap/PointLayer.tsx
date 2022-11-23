import { Layer } from "react-map-gl";
import { useMemo } from "react";
import mapboxgl, { CirclePaint } from "mapbox-gl";

export type PointLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
    options?: {
        maxRadius: number
        minRadius: number
    }
}

export const PointLayer: React.FC<PointLayerProps> = ({ layerId, sourceId, sourceLayer, color, options, visible }) => {
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

    const layer: mapboxgl.Layer = {
        id: layerId,
        source: sourceId,
        // "source-layer": sourceLayer,
        type: 'circle',
        paint: circle,
        layout: {
            visibility: visible ? "visible" : "none",
        },
        filter: ['==', ['geometry-type'], 'Point'],
    }
    if (sourceLayer) {
        layer["source-layer"] = sourceLayer
    }

    return (
        <>
            <Layer {...layer as any} />
            {/* <Layer
                id={`${layerId}-selected`}
                source={sourceId}
                type={"circle"}
                paint={selected}
                layout={{
                    visibility: visible ? "visible" : "none",
                }}
                filter={['in', 'id', '']}
                {...{
                    'source-layer': sourceLayer,
                }}
            /> */}
        </>
    )
}

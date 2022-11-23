import { Layer } from "react-map-gl";
import { useMemo } from "react";
import { FillPaint } from "mapbox-gl";

export type FillLayerProps = {
    layerId: string
    sourceId: string
    sourceLayer?: string
    color: string
    visible: boolean
}

export const FillLayer: React.FC<FillLayerProps> = ({ layerId, sourceId, sourceLayer, color, visible }) => {
    const fill = useMemo(() => {
        const fill: FillPaint = {
            "fill-color": color,
            "fill-opacity": 0.25,
        }
        return fill
    }, [color])

    return (
        <>
            <Layer
                id={`${layerId}`}
                source={sourceId}
                type={"fill"}
                paint={fill}
                layout={{
                    visibility: visible ? "visible" : "none"
                }}
                filter={['==', ['geometry-type'], 'Polygon']}
                {...{
                    'source-layer': sourceLayer,
                }}
            />
        </>
    )
}

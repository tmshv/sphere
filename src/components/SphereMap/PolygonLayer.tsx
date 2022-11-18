import { Layer } from "react-map-gl";
import { createFillPaint, createLinePaint } from "@/lib/createPaint";

const useFillPaint = createFillPaint(colors => ({
    fill: {
        "fill-color": colors["blue"][5],
        "fill-opacity": 0.25,
    },
}))

const useLinePaint = createLinePaint(colors => ({
    outline0: {
        "line-color": "white",
        "line-width": 3,
    },
    outline1: {
        "line-color": colors["blue"][5],
        "line-width": 1,
    }
}))

export type PolygonLayerProps = {
    sourceId: string
}

export const PolygonLayer: React.FC<PolygonLayerProps> = ({ sourceId }) => {
    const { fill } = useFillPaint()
    const { outline0, outline1 } = useLinePaint()

    return (
        <>
            <Layer
                id={`${sourceId}-polygons-fill`}
                source={sourceId}
                type={"fill"}
                paint={fill}
            />
            <Layer
                id={`${sourceId}-polygons-outline-0`}
                source={sourceId}
                type={"line"}
                paint={outline0}
            />
            <Layer
                id={`${sourceId}-polygons-outline-1`}
                source={sourceId}
                type={"line"}
                paint={outline1}
            />
        </>
    )
}

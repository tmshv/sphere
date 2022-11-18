import { Layer } from "react-map-gl";
import { createLinePaint } from "@/lib/createPaint";

const useLinePaint = createLinePaint(colors => ({
    line0: {
        "line-color": "white",
        "line-width": 3,
    },
    line1: {
        "line-color": colors["blue"][9],
        "line-width": 1,
        "line-dasharray": [4, 1],
    }
}))

export type LineStringLayerProps = {
    sourceId: string
}

export const LineStringLayer: React.FC<LineStringLayerProps> = ({ sourceId }) => {
    const { line0, line1 } = useLinePaint()

    return (
        <>
            <Layer
                id={`${sourceId}-lines-0`}
                source={sourceId}
                type={"line"}
                paint={line0}
            />
            <Layer
                id={`${sourceId}-lines-1`}
                source={sourceId}
                type={"line"}
                paint={line1}
            />
        </>
    )
}

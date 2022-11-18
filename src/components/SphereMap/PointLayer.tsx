import { Layer } from "react-map-gl";
import { createCirclePaint } from "@/lib/createPaint";

const useCirclePaint = createCirclePaint(colors => ({
    circle: {
        "circle-color": colors["blue"][5],
        "circle-radius": 4,
        "circle-stroke-color": "white",
        "circle-stroke-width": 1,
    }
}))

export type PointLayerProps = {
    sourceId: string
}

export const PointLayer: React.FC<PointLayerProps> = ({ sourceId }) => {
    const { circle } = useCirclePaint()

    return (
        <Layer
            id={`${sourceId}-circles`}
            source={sourceId}
            type={"circle"}
            paint={circle}
        />
    )
}

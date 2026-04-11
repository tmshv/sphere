import { LayerType, type SourceMetadata } from "@/types"

export default function predictLayerType({
    pointsCount,
    linesCount,
    polygonsCount,
}: SourceMetadata): LayerType | undefined {
    if (pointsCount > 0 && linesCount === 0 && polygonsCount === 0) {
        return LayerType.Point
    }
    if (pointsCount === 0 && linesCount > 0 && polygonsCount === 0) {
        return LayerType.Line
    }
    if (pointsCount === 0 && linesCount === 0 && polygonsCount > 0) {
        return LayerType.Polygon
    }
    return undefined
}

export function fallbackLayerType({ pointsCount, linesCount, polygonsCount }: SourceMetadata): LayerType {
    if (pointsCount > 0) return LayerType.Point
    if (linesCount > 0) return LayerType.Line
    if (polygonsCount > 0) return LayerType.Polygon
    return LayerType.Point
}

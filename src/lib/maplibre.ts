import type { Map as MaplibreMap, Point, PointLike } from "maplibre-gl"

const QUERY_SIZE = 8

export function queryFeaturesInPoint(map: MaplibreMap, point: Point, layers: string[]) {
    const bbox: [PointLike, PointLike] = [
        [point.x - QUERY_SIZE / 2, point.y - QUERY_SIZE / 2],
        [point.x + QUERY_SIZE / 2, point.y + QUERY_SIZE / 2],
    ]
    const features = map.queryRenderedFeatures(bbox, {
        layers,
    })

    if (features.length === 0) {
        return []
    }

    return features
}

export function visibility(value: boolean): "visible" | "none" {
    return value ? "visible" : "none"
}

export function sourceLayerProp(value?: string | null): object {
    if (!value) {
        return {}
    }
    return {
        "source-layer": value,
    }
}

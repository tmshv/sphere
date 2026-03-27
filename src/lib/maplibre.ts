import type { FilterSpecification, Map as MaplibreMap, Point, PointLike } from "maplibre-gl"

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

// FilterSpecification is a complex union; dynamic construction requires a cast at this boundary
export function combineFilters(base: unknown[], userFilter?: unknown[] | null): FilterSpecification {
    if (!userFilter) {
        return base as FilterSpecification
    }
    return ["all", base, userFilter] as unknown as FilterSpecification
}

export function sourceLayerProp(value?: string | null): object {
    if (!value) {
        return {}
    }
    return {
        "source-layer": value,
    }
}

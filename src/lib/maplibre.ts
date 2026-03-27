import { featureFilter } from "@maplibre/maplibre-gl-style-spec"
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

// Combines filter expressions into a single ["all", ...] filter.
// Filters whose top-level operator is "all" are flattened into the result.
export function combineFilters(...filters: FilterSpecification[]): FilterSpecification | undefined {
    const parts: FilterSpecification[] = []
    for (const f of filters) {
        if (typeof f === "boolean") {
            continue
        }
        if (f[0] === "all") {
            parts.push(...(f.slice(1) as FilterSpecification[]))
        } else {
            parts.push(f)
        }
    }
    if (parts.length === 0) {
        return undefined
    }
    if (parts.length === 1) {
        return parts[0]
    }
    return ["all", ...parts] as FilterSpecification
}

// Validates a parsed filter expression against the MapLibre filter spec.
// Returns true if valid, false if featureFilter rejects it.
export function isValidFilterExpression(expression: unknown[]): boolean {
    try {
        featureFilter(expression as FilterSpecification)
        return true
    } catch {
        return false
    }
}

export function sourceLayerProp(value?: string | null): object {
    if (!value) {
        return {}
    }
    return {
        "source-layer": value,
    }
}

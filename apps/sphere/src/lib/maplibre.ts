import { featureFilter } from "@maplibre/maplibre-gl-style-spec"
import type { FilterSpecification, Map as MaplibreMap, MapGeoJSONFeature, Point, PointLike } from "maplibre-gl"

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

// Returns true if the expression uses modern MapLibre expression syntax, false if it is legacy.
// Logic mirrors isExpressionFilter from @maplibre/maplibre-gl-style-spec (not exported from dist).
// TODO: use convertFilter here to migrate legacy syntax to new syntax instead of rejecting it.
export function isExpressionFilter(expression: FilterSpecification): boolean {
    if (!Array.isArray(expression) || expression.length === 0) {
        return typeof expression === "boolean"
    }
    switch (expression[0]) {
        case "has":
            return expression.length >= 2 && expression[1] !== "$id" && expression[1] !== "$type"
        case "in":
            return expression.length >= 3 && (typeof expression[1] !== "string" || Array.isArray(expression[2]))
        case "!in":
        case "!has":
        case "none":
            return false
        case "==":
        case "!=":
        case ">":
        case ">=":
        case "<":
        case "<=":
            return expression.length !== 3 || Array.isArray(expression[1]) || Array.isArray(expression[2])
        case "any":
        case "all":
            return expression
                .slice(1)
                .every(f => typeof f === "boolean" || isExpressionFilter(f as FilterSpecification))
        default:
            return true
    }
}

// Validates a parsed filter expression against the MapLibre filter spec.
// Returns true if valid modern expression, false if legacy syntax or featureFilter rejects it.
export function isValidFilterExpression(expression: unknown[]): boolean {
    if (!isExpressionFilter(expression as FilterSpecification)) {
        return false
    }
    try {
        featureFilter(expression as FilterSpecification)
        return true
    } catch {
        return false
    }
}

export function queryFeaturesInScreenRect(
    map: MaplibreMap,
    start: { x: number; y: number },
    end: { x: number; y: number },
    layers: string[],
): MapGeoJSONFeature[] {
    const containerRect = map.getContainer().getBoundingClientRect()
    const sx0 = Math.min(start.x, end.x) - containerRect.left
    const sy0 = Math.min(start.y, end.y) - containerRect.top
    const sx1 = Math.max(start.x, end.x) - containerRect.left
    const sy1 = Math.max(start.y, end.y) - containerRect.top
    const bbox: [PointLike, PointLike] = [
        [sx0, sy0],
        [sx1, sy1],
    ]
    return map.queryRenderedFeatures(bbox, { layers })
}

export function serializeFeaturesForIpc(features: MapGeoJSONFeature[]): string {
    const seen = new Set<number>()
    const cleaned: object[] = []
    for (const f of features) {
        if (typeof f.id !== "number") continue
        if (seen.has(f.id)) continue
        seen.add(f.id)
        cleaned.push({
            type: "Feature",
            id: f.id,
            geometry: f.geometry,
            properties: f.properties,
        })
    }
    return JSON.stringify(cleaned)
}

export function sourceLayerProp(value?: string | null): object {
    if (!value) {
        return {}
    }
    return {
        "source-layer": value,
    }
}

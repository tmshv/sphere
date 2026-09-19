import type { SourceMetadata, SourceSchema } from "@/types"

export const EMPTY_SOURCE_METADATA: SourceMetadata = {
    columns: {},
    pointsCount: 0,
    multiPointsCount: 0,
    linesCount: 0,
    multiLinesCount: 0,
    polygonsCount: 0,
    multiPolygonsCount: 0,
    collectionsCount: 0,
    nullGeometryCount: 0,
    featuresCount: 0,
}

export function createSourceMetadataFromFeatureCollection(
    fc: GeoJSON.FeatureCollection,
    columns: Record<string, string> = {},
): SourceMetadata {
    const meta: SourceMetadata = {
        columns,
        pointsCount: 0,
        multiPointsCount: 0,
        linesCount: 0,
        multiLinesCount: 0,
        polygonsCount: 0,
        multiPolygonsCount: 0,
        collectionsCount: 0,
        nullGeometryCount: 0,
        featuresCount: 0,
    }

    for (const f of fc.features) {
        meta.featuresCount += 1
        if (!f.geometry) {
            meta.nullGeometryCount += 1
            continue
        }
        switch (f.geometry.type) {
            case "Point":
                meta.pointsCount += 1
                break
            case "MultiPoint":
                meta.pointsCount += 1
                meta.multiPointsCount += 1
                break
            case "LineString":
                meta.linesCount += 1
                break
            case "MultiLineString":
                meta.linesCount += 1
                meta.multiLinesCount += 1
                break
            case "Polygon":
                meta.polygonsCount += 1
                break
            case "MultiPolygon":
                meta.polygonsCount += 1
                meta.multiPolygonsCount += 1
                break
            case "GeometryCollection":
                meta.collectionsCount += 1
                break
            default:
                break
        }
    }

    return meta
}

export function sourceMetadataFromSchema(schema: SourceSchema): SourceMetadata {
    return {
        columns: schema.columns,
        pointsCount: schema.points_count,
        multiPointsCount: schema.multi_points_count,
        linesCount: schema.lines_count,
        multiLinesCount: schema.multi_lines_count,
        polygonsCount: schema.polygons_count,
        multiPolygonsCount: schema.multi_polygons_count,
        collectionsCount: schema.collections_count,
        nullGeometryCount: schema.null_geometry_count,
        featuresCount: schema.features_count,
    }
}

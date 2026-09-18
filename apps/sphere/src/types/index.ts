export type Projection = "mercator" | "globe"

export type LayerRenderType = "Point" | "LineString" | "Polygon" | "photo" | "layer" | "unknown"

export type SourceFormat = "geojson" | "csv" | "shapefile" | "gpx"

export enum SourceType {
    FeatureCollection = "FeatureCollection",
    Geojson = "GeoJSON",
    MVT = "MVT",
    Raster = "Raster",

    // Points = "Point",
    // Lines = "LineString",
    // Polygons = "Polygon",
}

export enum LayerType {
    Point = "Circle",
    Line = "Line",
    Polygon = "Polygon",
    Photo = "Photo",
    Heatmap = "Heatmap",
    Raster = "Raster",
    Extrusion = "Extrusion",
}

export type SourceMetadata = {
    columns: Record<string, string>
    pointsCount: number
    multiPointsCount: number
    linesCount: number
    multiLinesCount: number
    polygonsCount: number
    multiPolygonsCount: number
    collectionsCount: number
    nullGeometryCount: number
    featuresCount: number
}

export type SourceSchema = {
    columns: Record<string, string>
    points_count: number
    multi_points_count: number
    lines_count: number
    multi_lines_count: number
    polygons_count: number
    multi_polygons_count: number
    collections_count: number
    null_geometry_count: number
    features_count: number
}

export type PointLike = GeoJSON.Point | GeoJSON.MultiPoint
export type LineStringLike = GeoJSON.LineString | GeoJSON.MultiLineString
export type PolygonLike = GeoJSON.Polygon | GeoJSON.MultiPolygon

export type Id = string
export type DatasetGeometry = PointLike | LineStringLike | PolygonLike

export type DatasetRecordMeta = {
    type: number | string | boolean
    // min?: number
    // max?: number
}

export type DatasetRow<G> = {
    id: number
    geometry?: G
    data: Record<string, unknown>
    meta: Record<string, DatasetRecordMeta>
}

// export type Dataset = GeoJSON.FeatureCollection | string
// export type Dataset<T extends SourceType, G = PointLike | LineStringLike | PolygonLike> = {
//     data: DatasetRow<G>[]
// }

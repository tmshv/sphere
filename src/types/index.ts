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
}

export type SourceMetadata = {
    pointsCount: number
    linesCount: number
    polygonsCount: number
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
    data: Record<string, any>
    meta: Record<string, DatasetRecordMeta>
}

// export type Dataset = GeoJSON.FeatureCollection | string
// export type Dataset<T extends SourceType, G = PointLike | LineStringLike | PolygonLike> = {
//     data: DatasetRow<G>[]
// }

export type FileParser = (raw: string) => Promise<[GeoJSON.FeatureCollection, SourceMetadata]>

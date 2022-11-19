export enum SourceType {
    Points = "Point",
    Lines = "LineString",
    Polygons = "Polygon",
}

export enum LayerType {
    Point = "Circle",
    Line = "Line",
    Polygon = "Polygon",
    Photo = "Photo",
    Heatmap = "Heatmap",
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
    id: Id
    geometry?: G
    data: Record<string, any>
    meta: Record<string, DatasetRecordMeta>
}

type DatasetCore = {
    id: Id
    name: string
    location: string
}

export type PointDataset<G = PointLike | LineStringLike | PolygonLike> = DatasetCore & {
    type: SourceType.Points,
    // data: DatasetRow<Point>[]
    data: DatasetRow<G>[]
}

export type LineStringDataset<G = PointLike | LineStringLike | PolygonLike> = DatasetCore & {
    type: SourceType.Lines,
    // data: DatasetRow<LineString>[]
    data: DatasetRow<G>[]
}

export type PolygonDataset<G = PointLike | LineStringLike | PolygonLike> = DatasetCore & {
    type: SourceType.Polygons,
    // data: DatasetRow<Polygon>[]
    data: DatasetRow<G>[]
}

export type Dataset<G = PointLike | LineStringLike | PolygonLike> =
    | PointDataset<G>
    | LineStringDataset<G>
    | PolygonDataset<G>

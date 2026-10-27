import type { Id, SourceFormat, SourceMetadata, SourceType } from "@/types"
import type { TileJSON } from "@/types/tilejson"

export type GeojsonSource = {
    type: SourceType.Geojson
    format: SourceFormat
    meta: SourceMetadata
    location: string
    version: number
    editable: false
    pending: false
}

export type VectorSource = {
    type: SourceType.MVT
    tilejson: TileJSON
    location: string
    format: "pbf" | "png" | "jpg" | "webp"
    // layers:
    editable: false
    sourceLayers: { id: string; name: string }[]
    pending: false
}

// An XYZ tile template set served straight from the web, without TileJSON
export type RasterTiles = {
    urls: string[]
    tileSize: number
    maxzoom: number
    attribution: string
}

export type RasterSource = {
    type: SourceType.Raster
    location: string
    // Absent when `location` is a TileJSON URL
    tiles?: RasterTiles
    editable: false
    pending: false
}

export type FeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location: string
    version: number
    editable: true
    pending: false
    meta: SourceMetadata
}

export type PendingFeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location?: string
    editable: true
    pending: true
}

export type Source = (
    | GeojsonSource
    | VectorSource
    | RasterSource
    | PendingFeatureCollecionSource
    | FeatureCollecionSource
) & {
    id: Id
    name: string
    error?: string
}

// type PendingSource = {
//     id: Id
//     name: string
//     status: LoadingStatus
// }

import { Id, SourceMetadata, SourceType } from "@/types"
import type { TileJSON } from "@/types/tilejson"

export type GeojsonSource = {
    type: SourceType.Geojson
    meta: SourceMetadata
    location: string
    editable: true
    pending: false
}

export type VectorSource = {
    type: SourceType.MVT
    tilejson: TileJSON
    location: string
    // layers:
    editable: false
    sourceLayers: { id: string, name: string }[]
    pending: false
}

export type RasterSource = {
    type: SourceType.Raster
    location: string
    editable: false
    pending: false
}

export type FeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location?: string
    dataset: GeoJSON.FeatureCollection
    editable: true
    pending: false
    meta: SourceMetadata
}

export type PendingFeatureCollecionSource = {
    type: SourceType.FeatureCollection
    location?: string
    dataset?: GeoJSON.FeatureCollection
    editable: true
    pending: true
}

export type Source = (GeojsonSource | VectorSource | RasterSource | PendingFeatureCollecionSource | FeatureCollecionSource) & {
    id: Id
    name: string
    fractionIndex: number
    error?: string
}

// type PendingSource = {
//     id: Id
//     name: string
//     status: LoadingStatus
// }

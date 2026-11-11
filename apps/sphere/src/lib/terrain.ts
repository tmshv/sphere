import { SourceType } from "@/types"
import type { Id } from "@/types"
import type { Source } from "@/types/source"
import type { DemEncoding } from "@/types/terrain"
import { isRasterTileFormat } from "./tilejson"

// Elevation tiles in an MBTiles file are assumed to use the Terrarium encoding
export const MBTILES_DEM_ENCODING: DemEncoding = "terrarium"

export const HILLSHADE_LAYER_ID = "sphere-hillshade"

export const TERRAIN_EXAGGERATION = { min: 0, max: 3, step: 0.1 }

// The elevation encoding of a source, or null when the source is not elevation data
export function demEncodingOf(source: Source | undefined): DemEncoding | null {
    if (!source) return null
    if (source.type === SourceType.MVT) {
        return isRasterTileFormat(source.format) ? MBTILES_DEM_ENCODING : null
    }
    if (source.type === SourceType.Raster) {
        return source.dem ?? null
    }
    return null
}

export function terrainDemSourceId(id: Id): string {
    return `terrain-dem-${id}`
}

export function hillshadeDemSourceId(id: Id): string {
    return `hillshade-dem-${id}`
}

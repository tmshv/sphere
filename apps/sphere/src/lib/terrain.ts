import { SourceType } from "@/types"
import type { Id } from "@/types"
import type { Source } from "@/types/source"
import type { DemEncoding } from "@/types/terrain"
import type { SourceProps } from "react-map-gl/maplibre"
import { rasterTileProps } from "./source"
import { isRasterTileFormat } from "./tilejson"

// Elevation tiles in an MBTiles file are assumed to use the Terrarium encoding
export const MBTILES_DEM_ENCODING: DemEncoding = "terrarium"

// Raster MBTiles are served through the sphere:// protocol as 256px tiles, as SphereSource mounts them
const MBTILES_TILE_SIZE = 256

const RASTER_LAYER_TYPE = "raster"

export const HILLSHADE_LAYER_ID = "sphere-hillshade"

export const TERRAIN_EXAGGERATION = { min: 0, max: 3, step: 0.1, default: 1.5 }

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

// The tiles of an elevation source mounted as a raster-dem source; null for a source that holds no tiles
export function demSourceProps(source: Source, encoding: DemEncoding): SourceProps | null {
    if (source.type === SourceType.MVT) {
        return { type: "raster-dem", url: `sphere://${source.id}/tilejson`, tileSize: MBTILES_TILE_SIZE, encoding }
    }
    if (source.type === SourceType.Raster) {
        return { type: "raster-dem", ...rasterTileProps(source), encoding }
    }
    return null
}

/**
 * The `beforeId` that puts the hillshade directly above the topmost raster layer of `order` (bottom to top),
 * or at the bottom of the stack when there is no raster layer. `undefined` means the top of the stack.
 */
export function hillshadePlacement(order: { id: string; type: string }[]): string | undefined {
    const layers = order.filter(({ id }) => id !== HILLSHADE_LAYER_ID)
    const topRaster = layers.findLastIndex(({ type }) => type === RASTER_LAYER_TYPE)
    return layers.slice(topRaster + 1).at(0)?.id
}

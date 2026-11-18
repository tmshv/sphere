import type { RasterSource, Source } from "@/types/source"
import { type SourceMetadata, SourceType } from "@/types"

export function isMvtSource(source: Source | undefined): boolean {
    return source?.type === SourceType.MVT
}

/**
 * The backend keeps a feature store (attributes, properties table) only for
 * GeoJSON sources and loaded in-memory FeatureCollections.
 */
export function hasFeatureStore(source: Source | undefined): source is Source & { meta: SourceMetadata } {
    if (source?.type === SourceType.Geojson) {
        return true
    }
    return source?.type === SourceType.FeatureCollection && !source.pending
}

// Where a raster's tiles come from: a web raster is served straight from its XYZ tiles, any other raster
// from its TileJSON URL
export function rasterTileProps(
    source: RasterSource,
): { url: string } | { tiles: string[]; tileSize: number; maxzoom: number; attribution: string } {
    const { tiles, location } = source
    if (!tiles) {
        return { url: location }
    }
    const { urls, tileSize, maxzoom, attribution } = tiles
    return { tiles: urls, tileSize, maxzoom, attribution }
}

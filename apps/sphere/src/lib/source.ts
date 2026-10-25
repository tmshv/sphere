import type { Source } from "@/types/source"
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

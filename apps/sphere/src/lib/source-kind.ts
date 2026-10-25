import { type SourceKind, type SourceNode, SourceType } from "@/types"
import type { Source } from "@/types/source"
import { isRasterTileFormat } from "./tilejson"

/**
 * The kind of a tree node. Child and folder nodes are their own kind; a source node takes its kind
 * from its source item. `null` when a source node has no item.
 */
export function sourceKindOf(node: SourceNode | undefined, source: Source | null | undefined): SourceKind | null {
    if (node?.kind === "source-layer" || node?.kind === "folder") {
        return node.kind
    }
    if (!source) {
        return null
    }
    switch (source.type) {
        case SourceType.Geojson:
            return source.format
        case SourceType.FeatureCollection:
            return "geojson"
        case SourceType.MVT:
            return isRasterTileFormat(source.format) ? "raster-tiles" : "vector-tiles"
        case SourceType.Raster:
            return "raster-tiles"
        default:
            return null
    }
}

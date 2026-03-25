import type { TileJSON } from "@/types/tilejson"

export const RASTER_TILE_FORMATS = new Set<NonNullable<TileJSON["format"]>>(["png", "jpg", "webp"])

export function isRasterTileFormat(format: TileJSON["format"]): boolean {
    return format !== undefined && RASTER_TILE_FORMATS.has(format)
}

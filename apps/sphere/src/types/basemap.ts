import type { RasterTiles } from "./source"

export type BasemapId = "osm" | "sentinel2-2016"

export type Basemap = {
    name: string
    // Home page of the tile provider
    location: string
    tiles: RasterTiles
}

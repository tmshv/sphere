import type { Basemap, BasemapId } from "@/types/basemap"
import type { StyleSpecification } from "maplibre-gl"

export const MAP_ID = "spheremap"
// Basemaps are user sources, so the base style draws nothing
export const EMPTY_STYLE: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [],
}
const RASTER_TILE_SIZE = 256
export const BASEMAPS: Record<BasemapId, Basemap> = {
    osm: {
        name: "OpenStreetMap",
        location: "https://www.openstreetmap.org",
        tiles: {
            urls: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: RASTER_TILE_SIZE,
            maxzoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
    },
    // The 2016 edition is the only Sentinel-2 cloudless year under CC BY 4.0; later ones are non-commercial
    "sentinel2-2016": {
        name: "Sentinel-2 cloudless 2016",
        location: "https://s2maps.eu",
        tiles: {
            urls: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"],
            tileSize: RASTER_TILE_SIZE,
            // Native 10 m resolution; deeper zooms are upscaled by MapLibre
            maxzoom: 14,
            attribution:
                '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016)',
        },
    },
}
export const EMPTY_GEOJSON = {
    type: "FeatureCollection",
    features: [],
}
// export const FEATURE_HIGHLIGHT_COLOR = "#fbb13a"
export const FEATURE_HIGHLIGHT_COLOR = "red"
export const PREVIEW_COLOR = "black" // tableu10[0]
export const PREVIEW_RADIUS = 3
export const DRAW_ORIG_ID_KEY = "__sphere_draw_origid"

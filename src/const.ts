import type { StyleSpecification } from "maplibre-gl"

export const MAP_ID = "spheremap"
export const STYLE_VECTOR = "mapbox://styles/mapbox/streets-v9"
export const STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12"
export const STYLE_OSM: StyleSpecification = {
    name: "osm",
    version: 8,
    sources: {
        "osm-raster-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
        },
    },
    layers: [
        {
            id: "osm-raster-layer",
            type: "raster",
            source: "osm-raster-tiles",
            minzoom: 0,
            maxzoom: 22,
        },
    ],
}
export const EMPTY_GEOJSON = {
    type: "FeatureCollection",
    features: [],
}
// export const FEATURE_HIGHLIGHT_COLOR = "#fbb13a"
export const FEATURE_HIGHLIGHT_COLOR = "red"
export const PREVIEW_COLOR = "black"  // tableu10[0]
export const PREVIEW_RADIUS = 3

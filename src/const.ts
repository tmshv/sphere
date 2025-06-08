import type { StyleSpecification } from "maplibre-gl"

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

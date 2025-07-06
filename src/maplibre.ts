import "maplibre-gl/dist/maplibre-gl.css"
import "@hyvilo/maplibre-gl-draw/dist/maplibre-gl-draw.css"

import maplibre from "maplibre-gl"

import { MapboxProtocol } from "@/lib/mapbox-protocol"
import { SphereProtocol } from "@/lib/sphere-protocol"

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

export function setupMaplibre() {
    const mb = new MapboxProtocol(MAPBOX_ACCESS_TOKEN)
    maplibre.addProtocol(mb.name, mb.createHandler())

    const sp = new SphereProtocol()
    maplibre.addProtocol(sp.name, sp.createHandler())
}

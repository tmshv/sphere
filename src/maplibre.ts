import "maplibre-gl/dist/maplibre-gl.css"
import "@hyvilo/maplibre-gl-draw/dist/maplibre-gl-draw.css"

import type { Map, Point, PointLike } from "maplibre-gl"

import maplibre from "maplibre-gl"

import { MapboxProtocol } from "@/lib/mapbox-protocol"
import { SphereProtocol } from "@/lib/sphere-protocol"

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"
const QUERY_SIZE = 8

export function setupMaplibre() {
    const mb = new MapboxProtocol(MAPBOX_ACCESS_TOKEN)
    maplibre.addProtocol(mb.name, mb.createHandler())

    const sp = new SphereProtocol()
    maplibre.addProtocol(sp.name, sp.createHandler())
}

export function queryFeaturesInPoint(map: Map, point: Point, layers: string[]) {
    const bbox: [PointLike, PointLike] = [
        [point.x - QUERY_SIZE / 2, point.y - QUERY_SIZE / 2],
        [point.x + QUERY_SIZE / 2, point.y + QUERY_SIZE / 2],
    ]
    const features = map.queryRenderedFeatures(bbox, {
        layers,
    })

    if (features.length === 0) {
        return []
    }

    return features
}

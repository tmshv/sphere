import type * as maplibregl from "maplibre-gl"

const store = new Map<string, maplibregl.Map>()

export function setMap(id: string, map: maplibregl.Map) {
    store.set(id, map)
}

export function removeMap(id: string) {
    store.delete(id)
}

export function getMap(id: string) {
    return store.get(id)
}

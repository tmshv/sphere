import mapboxgl from "mapbox-gl";

const store = new Map<string, mapboxgl.Map>()

export function setMap(id: string, map: mapboxgl.Map) {
    store.set(id, map)
}

export function removeMap(id: string) {
    store.delete(id)
}

export function getMap(id: string) {
    return store.get(id)!
}

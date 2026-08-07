import type { Subscription } from "maplibre-gl"

// MapLibre Draw fires its events on the map instance, but maplibre-gl v6 types
// `Map.on`/`Map.off` against the closed `MapEventType` map, which only knows
// about built-in events. `MapEventType` is a type alias and cannot be extended,
// so the plugin's events are declared here by merging into the `Map` class.
declare module "maplibre-gl" {
    type DrawEventName =
        | "draw.create"
        | "draw.update"
        | "draw.delete"
        | "draw.combine"
        | "draw.uncombine"
        | "draw.selectionchange"
        | "draw.modechange"
        | "draw.actionable"
        | "draw.render"

    type DrawEventPayload = {
        type: DrawEventName
        features?: GeoJSON.Feature[]
        createdFeatures?: GeoJSON.Feature[]
        deletedFeatures?: GeoJSON.Feature[]
    }

    interface Map {
        on(type: DrawEventName, listener: (event: DrawEventPayload) => void): Subscription
    }
}

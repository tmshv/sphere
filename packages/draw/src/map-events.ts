import type { Map as MapLibreMap, Subscription } from "maplibre-gl"
import type { DrawActionableState, DrawExportedFeature, DrawPointFeature } from "./types"

/** Data Draw passes with each event it fires on the map, by event name. */
export interface DrawEventPayloads {
    /** Features that were created */
    "draw.create": { features: DrawExportedFeature[] }
    /** Features that were deleted */
    "draw.delete": { features: DrawExportedFeature[] }
    /** Features that were updated and the name of the action that updated them */
    "draw.update": { features: DrawExportedFeature[]; action: string }
    /** Features selected after the change, and the selected vertices as points */
    "draw.selectionchange": { features: DrawExportedFeature[]; points: DrawPointFeature[] }
    /** The mode Draw is changing to */
    "draw.modechange": { mode: string }
    /** Which actions are possible in the current mode and selection */
    "draw.actionable": { actions: DrawActionableState }
    "draw.render": Record<string, never>
    /** Multi features created and the features combined into them */
    "draw.combine": { createdFeatures: DrawExportedFeature[]; deletedFeatures: DrawExportedFeature[] }
    /** Features created and the multi features split into them */
    "draw.uncombine": { createdFeatures: DrawExportedFeature[]; deletedFeatures: DrawExportedFeature[] }
}

export type DrawEventName = keyof DrawEventPayloads

/** A Draw event as listeners receive it: MapLibre adds `type` and `target` to the payload. */
export type DrawEvent<T extends DrawEventName = DrawEventName> = DrawEventPayloads[T] & {
    type: T
    target: MapLibreMap
}

export type DrawCreateEvent = DrawEvent<"draw.create">
export type DrawDeleteEvent = DrawEvent<"draw.delete">
export type DrawUpdateEvent = DrawEvent<"draw.update">
export type DrawSelectionChangeEvent = DrawEvent<"draw.selectionchange">
export type DrawModeChangeEvent = DrawEvent<"draw.modechange">
export type DrawActionableEvent = DrawEvent<"draw.actionable">
export type DrawRenderEvent = DrawEvent<"draw.render">
export type DrawCombineEvent = DrawEvent<"draw.combine">
export type DrawUncombineEvent = DrawEvent<"draw.uncombine">

/** Anything Draw can fire its events on. MapLibre's `Map` is one. */
export interface DrawEventTarget {
    fire(type: string, properties?: object): unknown
}

/** Fires a Draw event on the map. */
export function fireDrawEvent<T extends DrawEventName>(
    map: DrawEventTarget,
    type: T,
    payload: DrawEventPayloads[T],
): void {
    map.fire(type, payload)
}

// MapLibre Draw fires its events on the map instance, but maplibre-gl types
// `Map.on`/`Map.off` against the closed `MapEventType` map, which only knows
// about built-in events. `MapEventType` is a type alias and cannot be extended,
// so Draw's events are declared here by merging into the `Map` class.
declare module "maplibre-gl" {
    interface Map {
        on<T extends DrawEventName>(type: T, listener: (event: DrawEvent<T>) => void): Subscription
        off<T extends DrawEventName>(type: T, listener: (event: DrawEvent<T>) => void): this
    }
}

import type { IControl, Map as MapLibreMap } from "maplibre-gl"
import runSetup, { type DrawSetup } from "./setup"
import setupOptions, { type DrawOptions, type DrawOptionsInput } from "./options"
import DrawApi from "./api"
import { DrawContext } from "./context"
import * as Constants from "./constants"
import * as lib from "./lib"
import modes from "./modes"

/**
 * A MapLibre control to draw and edit points, lines and polygons. Add it
 * with `map.addControl(draw)`; it fires `draw.*` events on the map.
 */
class MapLibreDraw extends DrawApi implements IControl {
    static modes = modes
    static constants = Constants
    static lib = lib

    types = Constants.types
    options: DrawOptions
    #setup: DrawSetup

    constructor(options?: DrawOptionsInput) {
        const resolved = setupOptions(options)
        const ctx = new DrawContext(resolved)
        super(ctx)
        this.options = resolved
        this.#setup = runSetup(ctx)
    }

    onAdd = (map: MapLibreMap): HTMLElement => this.#setup.onAdd(map)

    onRemove = (): this => {
        this.#setup.onRemove()
        return this
    }
}

export default MapLibreDraw

export type { ChangeModeOptions } from "./types"
export type { DrawOptions, DrawOptionsInput } from "./options"
export { default as Mode, type ModeContext } from "./modes/mode"
export type { ModeClass } from "./modes/mode_builder"
export type { RenderPush } from "./lib/mode_handler"
export type { DrawFeature } from "./feature_types/draw_feature"
export type {
    DrawActionableEvent,
    DrawCombineEvent,
    DrawCreateEvent,
    DrawDeleteEvent,
    DrawEvent,
    DrawEventName,
    DrawEventPayloads,
    DrawModeChangeEvent,
    DrawRenderEvent,
    DrawSelectionChangeEvent,
    DrawUncombineEvent,
    DrawUpdateEvent,
} from "./map-events"
export type {
    DrawActionableState,
    DrawControls,
    DrawExportedFeature,
    DrawFeatureCollection,
    DrawKeyboardEvent,
    DrawMouseEvent,
    DrawRenderFeature,
    DrawRenderProperties,
    DrawStyleLayer,
    DrawTouchEvent,
    FeatureId,
    FeatureProperties,
} from "./types"

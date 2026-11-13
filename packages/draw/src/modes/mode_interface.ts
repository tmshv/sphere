import type { Map as MapLibreMap } from "maplibre-gl"
import * as Constants from "../constants"
import featuresAt, { type FeaturesAtContext } from "../lib/features_at"
import jsonClone from "../lib/json_clone"
import type { ScreenBox } from "../lib/map_event_to_bounding_box"
import type { RenderPush } from "../lib/mode_handler"
import type { DrawOptions } from "../options"
import type Store from "../store"
import createFeature, { type AnyFeatureInput } from "../feature_types/create_feature"
import Point from "../feature_types/point"
import LineString from "../feature_types/line_string"
import Polygon from "../feature_types/polygon"
import MultiFeature from "../feature_types/multi_feature"
import type { DrawFeature } from "../feature_types/draw_feature"
import type {
    ChangeModeEventOptions,
    DeleteOptions,
    DrawActionableState,
    DrawFeatureInput,
    DrawFeatureTarget,
    DrawKeyboardEvent,
    DrawMouseEvent,
    DrawPointerEvent,
    DrawRenderFeature,
    DrawTouchEvent,
    FeatureId,
    HandlerResult,
    MapClasses,
    ScreenPoint,
    SelectedCoordinate,
} from "../types"

const MULTI_FEATURE_CLASS = "MultiFeature"

/** What a mode needs from the Draw context. */
export interface ModeContext extends FeaturesAtContext {
    readonly map: MapLibreMap
    readonly options: DrawOptions
    readonly store: Pick<
        Store,
        | "add"
        | "clearSelected"
        | "clearSelectedCoordinates"
        | "delete"
        | "deselect"
        | "featureChanged"
        | "get"
        | "getInitialConfigValue"
        | "getSelected"
        | "getSelectedIds"
        | "isSelected"
        | "select"
        | "setSelected"
        | "setSelectedCoordinates"
    >
    readonly events: {
        actionable(actions: DrawActionableState): void
        changeMode(mode: string, opts?: unknown, eventOpts?: ChangeModeEventOptions): void
    }
    readonly ui: {
        queueMapClasses(classes: MapClasses): void
        setActiveButton(id?: string): void
    }
}

/** Draw's options as a mode sees them: a JSON copy, without the modes. */
export type DrawConfig = Omit<DrawOptions, "modes">

/** A mode's life cycle hooks. Each gets the state its `onSetup` returned. */
export interface ModeHooks<State, Opts> {
    onSetup?(opts: Opts): State
    onDrag?(state: State, e: DrawPointerEvent): HandlerResult
    onClick?(state: State, e: DrawMouseEvent): HandlerResult
    onMouseMove?(state: State, e: DrawMouseEvent): HandlerResult
    onMouseDown?(state: State, e: DrawMouseEvent): HandlerResult
    onMouseUp?(state: State, e: DrawMouseEvent): HandlerResult
    onMouseOut?(state: State, e: MouseEvent): HandlerResult
    onKeyUp?(state: State, e: DrawKeyboardEvent): HandlerResult
    onKeyDown?(state: State, e: DrawKeyboardEvent): HandlerResult
    onTouchStart?(state: State, e: DrawTouchEvent): HandlerResult
    onTouchMove?(state: State, e: DrawTouchEvent): HandlerResult
    onTouchEnd?(state: State, e: DrawTouchEvent): HandlerResult
    onTap?(state: State, e: DrawTouchEvent): HandlerResult
    onStop?(state: State): void
    onTrash?(state: State): void
    onCombineFeatures?(state: State): void
    onUncombineFeatures?(state: State): void
    toDisplayFeatures(state: State, geojson: DrawRenderFeature, display: RenderPush): void
}

/**
 * A mode object: its hooks plus any helpers of its own (`Extra`). Its methods
 * run with `this` set to a `ModeInterface` mixed with the mode object.
 */
export type DrawMode<State, Opts = unknown, Extra = object> = ModeHooks<State, Opts> &
    Extra &
    ThisType<ModeInterface & ModeHooks<State, Opts> & Extra>

/** Any mode object, as Draw's `modes` option holds them. */
export type DrawModeObject = ModeHooks<unknown, unknown>

/**
 * The `this` of a mode's methods: Draw's API for modes, plus default no-op
 * life cycle hooks for the ones a mode leaves out.
 */
export default class ModeInterface {
    map: MapLibreMap
    drawConfig: Partial<DrawConfig>
    ctx: ModeContext

    constructor(ctx: ModeContext) {
        this.map = ctx.map
        // Test contexts may come without options
        this.drawConfig = jsonClone(ctx.options || {})
        this.ctx = ctx
    }

    /**
     * Sets Draw's interal selected state
     * @name this.setSelected
     * @param features - whats selected as a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature.js)
     */
    setSelected(features?: FeatureId | readonly FeatureId[]): unknown {
        return this.ctx.store.setSelected(features)
    }

    /**
     * Sets Draw's internal selected coordinate state
     * @name this.setSelectedCoordinates
     * @param coords - a array of {coord_path: 'string', feature_id: 'string'}
     */
    setSelectedCoordinates(coords: SelectedCoordinate[]): void {
        this.ctx.store.setSelectedCoordinates(coords)
        const changed = new Set<FeatureId>()
        for (const c of coords) {
            if (changed.has(c.feature_id)) continue
            changed.add(c.feature_id)
            const feature = this.ctx.store.get(c.feature_id)
            if (feature === undefined) throw new TypeError(`Draw has no feature ${c.feature_id}`)
            feature.changed()
        }
    }

    /**
     * Get all selected features as a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature.js).
     * An id selected without a feature yields `undefined`.
     * @name this.getSelected
     */
    getSelected(): (DrawFeature | undefined)[] {
        return this.ctx.store.getSelected()
    }

    /**
     * Get the ids of all currently selected features
     * @name this.getSelectedIds
     */
    getSelectedIds(): FeatureId[] {
        return this.ctx.store.getSelectedIds()
    }

    /**
     * Check if a feature is selected
     * @name this.isSelected
     * @param id - a feature id
     */
    isSelected(id: FeatureId): boolean {
        return this.ctx.store.isSelected(id)
    }

    /**
     * Get a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature.js) by its id
     * @name this.getFeature
     * @param id - a feature id
     */
    getFeature(id: FeatureId): DrawFeature | undefined {
        return this.ctx.store.get(id)
    }

    /**
     * Add a feature to draw's internal selected state
     * @name this.select
     */
    select(id: FeatureId | readonly FeatureId[]): unknown {
        return this.ctx.store.select(id)
    }

    /**
     * Remove a feature from draw's internal selected state
     * @name this.deselect
     */
    deselect(id: FeatureId | readonly FeatureId[]): unknown {
        return this.ctx.store.deselect(id)
    }

    /**
     * Delete a feature from draw
     * @name this.deleteFeature
     * @param id - a feature id
     */
    deleteFeature(id: FeatureId | readonly FeatureId[], opts: DeleteOptions = {}): unknown {
        return this.ctx.store.delete(id, opts)
    }

    /**
     * Add a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature.js) to draw.
     * See `this.newFeature` for converting geojson into a DrawFeature
     * @name this.addFeature
     * @param feature - the feature to add
     */
    addFeature(feature: DrawFeature): unknown {
        return this.ctx.store.add(feature)
    }

    /**
     * Clear all selected features
     */
    clearSelectedFeatures(): unknown {
        return this.ctx.store.clearSelected()
    }

    /**
     * Clear all selected coordinates
     */
    clearSelectedCoordinates(): unknown {
        return this.ctx.store.clearSelectedCoordinates()
    }

    /**
     * Indicate if the different action are currently possible with your mode
     * See [draw.actionalbe](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#drawactionable) for a list of possible actions. All undefined actions are set to **false** by default
     * @name this.setActionableState
     */
    setActionableState(actions: Partial<DrawActionableState> = {}): void {
        const newSet = {
            trash: actions.trash || false,
            combineFeatures: actions.combineFeatures || false,
            uncombineFeatures: actions.uncombineFeatures || false,
        }
        this.ctx.events.actionable(newSet)
    }

    /**
     * Trigger a mode change
     * @name this.changeMode
     * @param mode - the mode to transition into
     * @param opts - the options object to pass to the new mode
     * @param eventOpts - used to control what kind of events are emitted.
     */
    changeMode(mode: string, opts: unknown = {}, eventOpts: ChangeModeEventOptions = {}): void {
        this.ctx.events.changeMode(mode, opts, eventOpts)
    }

    /**
     * Update the state of draw map classes
     * @name this.updateUIClasses
     */
    updateUIClasses(opts: MapClasses): void {
        this.ctx.ui.queueMapClasses(opts)
    }

    /**
     * If a name is provided it makes that button active, else if makes all buttons inactive
     * @name this.activateUIButton
     * @param name - name of the button to make active, leave as undefined to set buttons to be inactive
     */
    activateUIButton(name?: string): void {
        this.ctx.ui.setActiveButton(name)
    }

    /**
     * Get the features at the location of an event object or in a bbox
     * @name this.featuresAt
     * @param event - a mapbox-gl event object
     * @param bbox - the area to get features from
     * @param bufferType - is this `click` or `touch` event, defaults to click
     */
    featuresAt(
        event: { point: ScreenPoint } | null,
        bbox: ScreenBox | null,
        bufferType: "click" | "touch" = "click",
    ): DrawFeatureTarget[] {
        // Plain JavaScript callers can pass any buffer type
        if (bufferType !== "click" && bufferType !== "touch") throw new Error("invalid buffer type")
        return featuresAt[bufferType](event, bbox, this.ctx)
    }

    /**
     * Create a new [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature.js) from geojson
     * @name this.newFeature
     */
    newFeature(geojson: DrawFeatureInput<"Point">): Point
    newFeature(geojson: DrawFeatureInput<"LineString">): LineString
    newFeature(geojson: DrawFeatureInput<"Polygon">): Polygon
    newFeature(geojson: DrawFeatureInput<"MultiPoint">): MultiFeature<"MultiPoint">
    newFeature(geojson: DrawFeatureInput<"MultiLineString">): MultiFeature<"MultiLineString">
    newFeature(geojson: DrawFeatureInput<"MultiPolygon">): MultiFeature<"MultiPolygon">
    newFeature(geojson: AnyFeatureInput): DrawFeature
    newFeature(geojson: AnyFeatureInput): DrawFeature {
        return createFeature(this.ctx, geojson)
    }

    /**
     * Check is an object is an instance of a [DrawFeature](https://github.com/mapbox/mapbox-gl-draw/blob/main/src/feature_types/feature.js)
     * @name this.isInstanceOf
     * @param type - `Point`, `LineString`, `Polygon`, `MultiFeature`
     * @param feature - the object that needs to be checked
     */
    isInstanceOf(type: "Point", feature: unknown): feature is Point
    isInstanceOf(type: "LineString", feature: unknown): feature is LineString
    isInstanceOf(type: "Polygon", feature: unknown): feature is Polygon
    isInstanceOf(type: "MultiFeature", feature: unknown): feature is MultiFeature
    isInstanceOf(type: string, feature: unknown): boolean
    isInstanceOf(type: string, feature: unknown): boolean {
        if (type === Constants.geojsonTypes.POINT) return feature instanceof Point
        if (type === Constants.geojsonTypes.LINE_STRING) return feature instanceof LineString
        if (type === Constants.geojsonTypes.POLYGON) return feature instanceof Polygon
        if (type === MULTI_FEATURE_CLASS) return feature instanceof MultiFeature
        throw new Error(`Unknown feature class: ${type}`)
    }

    /**
     * Force draw to rerender the feature of the provided id
     * @name this.doRender
     * @param id - a feature id
     */
    doRender(id: FeatureId): unknown {
        return this.ctx.store.featureChanged(id)
    }

    /**
     * Triggered while a mode is being transitioned into.
     * @param opts - this is the object passed via `draw.changeMode('mode', opts)`;
     * @name MODE.onSetup
     * @returns - this object will be passed to all other life cycle functions
     */
    onSetup(): unknown {
        return undefined
    }

    /**
     * Triggered when a drag event is detected on the map
     * @name MODE.onDrag
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onDrag(): void {}

    /**
     * Triggered when the mouse is clicked
     * @name MODE.onClick
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onClick(): void {}

    /**
     * Triggered with the mouse is moved
     * @name MODE.onMouseMove
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onMouseMove(): void {}

    /**
     * Triggered when the mouse button is pressed down
     * @name MODE.onMouseDown
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onMouseDown(): void {}

    /**
     * Triggered when the mouse button is released
     * @name MODE.onMouseUp
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onMouseUp(): void {}

    /**
     * Triggered when the mouse leaves the map's container
     * @name MODE.onMouseOut
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onMouseOut(): void {}

    /**
     * Triggered when a key up event is detected
     * @name MODE.onKeyUp
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onKeyUp(): void {}

    /**
     * Triggered when a key down event is detected
     * @name MODE.onKeyDown
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onKeyDown(): void {}

    /**
     * Triggered when a touch event is started
     * @name MODE.onTouchStart
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onTouchStart(): void {}

    /**
     * Triggered when one drags thier finger on a mobile device
     * @name MODE.onTouchMove
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onTouchMove(): void {}

    /**
     * Triggered when one removes their finger from the map
     * @name MODE.onTouchEnd
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onTouchEnd(): void {}

    /**
     * Triggered when one quicly taps the map
     * @name MODE.onTap
     * @param state - a mutible state object created by onSetup
     * @param e - the captured event that is triggering this life cycle event
     */
    onTap(): void {}

    /**
     * Triggered when the mode is being exited, to be used for cleaning up artifacts such as invalid features
     * @name MODE.onStop
     * @param state - a mutible state object created by onSetup
     */
    onStop(): void {}

    /**
     * Triggered when [draw.trash()](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#trash-draw) is called.
     * @name MODE.onTrash
     * @param state - a mutible state object created by onSetup
     */
    onTrash(): void {}

    /**
     * Triggered when [draw.combineFeatures()](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#combinefeatures-draw) is called.
     * @name MODE.onCombineFeatures
     * @param state - a mutible state object created by onSetup
     */
    onCombineFeatures(): void {}

    /**
     * Triggered when [draw.uncombineFeatures()](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#uncombinefeatures-draw) is called.
     * @name MODE.onUncombineFeatures
     * @param state - a mutible state object created by onSetup
     */
    onUncombineFeatures(): void {}

    /**
     * Triggered per feature on render to convert raw features into set of features for display on the map
     * See [styling draw](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#styling-draw) for information about what geojson properties Draw uses as part of rendering.
     * @name MODE.toDisplayFeatures
     * @param state - a mutible state object created by onSetup
     * @param geojson - a geojson being evaulated. To render, pass to `display`.
     * @param display - all geojson objects passed to this be rendered onto the map
     */
    toDisplayFeatures(): void {
        throw new Error("You must overwrite toDisplayFeatures")
    }
}

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
    ChangeModeOptions,
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
        changeMode(mode: string, opts?: ChangeModeOptions, eventOpts?: ChangeModeEventOptions): void
    }
    readonly ui: {
        queueMapClasses(classes: MapClasses): void
        setActiveButton(id?: string): void
    }
}

/** Draw's options as a mode sees them: a JSON copy, without the modes. */
export type DrawConfig = Omit<DrawOptions, "modes">

/**
 * A Draw mode. Subclass it to make one: Draw constructs the class when it
 * switches to the mode and drops the instance when it leaves, so one
 * instance is one activation of the mode. The constructor sets the mode up
 * (adds features, selects, sets UI classes and buttons) and keeps the mode's
 * state in fields.
 *
 * Event hooks are optional: Draw only listens to the events whose hook the
 * mode defines. A hook that returns something truthy skips the re-render
 * that follows the event.
 */
export default abstract class Mode {
    readonly map: MapLibreMap
    readonly drawConfig: Partial<DrawConfig>
    readonly ctx: ModeContext

    constructor(ctx: ModeContext) {
        this.map = ctx.map
        // Test contexts may come without options
        this.drawConfig = jsonClone(ctx.options || {})
        this.ctx = ctx
    }

    onDrag?(e: DrawPointerEvent): HandlerResult
    onClick?(e: DrawMouseEvent): HandlerResult
    onMouseMove?(e: DrawMouseEvent): HandlerResult
    onMouseDown?(e: DrawMouseEvent): HandlerResult
    onMouseUp?(e: DrawMouseEvent): HandlerResult
    onMouseOut?(e: MouseEvent): HandlerResult
    onKeyUp?(e: DrawKeyboardEvent): HandlerResult
    onKeyDown?(e: DrawKeyboardEvent): HandlerResult
    onTouchStart?(e: DrawTouchEvent): HandlerResult
    onTouchMove?(e: DrawTouchEvent): HandlerResult
    onTouchEnd?(e: DrawTouchEvent): HandlerResult
    onTap?(e: DrawTouchEvent): HandlerResult

    /** Called when Draw leaves the mode. */
    onStop?(): void

    /** Called by `draw.trash()`. */
    onTrash?(): void

    /** Called by `draw.combineFeatures()`. */
    onCombineFeatures?(): void

    /** Called by `draw.uncombineFeatures()`. */
    onUncombineFeatures?(): void

    /**
     * Called for every feature Draw renders. Push the GeoJSON features to
     * draw with `display`: the feature itself (possibly with changed
     * properties, see "Styling Draw" in docs/API.md), extra features such as
     * vertices, or nothing to hide it.
     */
    abstract toDisplayFeatures(geojson: DrawRenderFeature, display: RenderPush): void

    /**
     * Sets Draw's interal selected state
     * @name this.setSelected
     * @param features - whats selected as a `DrawFeature` (see `src/feature_types/feature.ts`)
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
     * Get all selected features as a `DrawFeature` (see `src/feature_types/feature.ts`).
     * An id selected without a feature yields `undefined`.
     * @name this.getSelected
     */
    getSelected(): DrawFeature[] {
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
     * Get a `DrawFeature` (see `src/feature_types/feature.ts`) by its id
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
     * Add a `DrawFeature` (see `src/feature_types/feature.ts`) to draw.
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
     * See `draw.actionable` (docs/API.md) for a list of possible actions. All undefined actions are set to **false** by default
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
    changeMode(mode: string, opts: ChangeModeOptions = {}, eventOpts: ChangeModeEventOptions = {}): void {
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
     * @param event - a MapLibre map event
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
     * Create a new `DrawFeature` (see `src/feature_types/feature.ts`) from geojson
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
     * Check is an object is an instance of a `DrawFeature` (see `src/feature_types/feature.ts`)
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
}

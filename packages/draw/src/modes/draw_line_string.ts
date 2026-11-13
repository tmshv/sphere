import type { Position } from "geojson"
import * as CommonSelectors from "../lib/common_selectors"
import isEventAtCoordinates from "../lib/is_event_at_coordinates"
import doubleClickZoom from "../lib/double_click_zoom"
import elementAt from "../lib/element_at"
import * as Constants from "../constants"
import createVertex from "../lib/create_vertex"
import LineString from "../feature_types/line_string"
import type { RenderPush } from "../lib/mode_handler"
import { fireDrawEvent } from "../map-events"
import type {
    ChangeModeOptions,
    DrawKeyboardEvent,
    DrawMouseEvent,
    DrawPointerEvent,
    DrawRenderFeature,
    DrawTouchEvent,
    LngLatValue,
} from "../types"
import Mode, { type ModeContext } from "./mode"

type Direction = "forward" | "backwards"

function isObject(value: unknown): value is object {
    return typeof value === "object" && value !== null
}

function isList(value: unknown): value is readonly unknown[] {
    return Array.isArray(value)
}

/** Unwraps a Feature<Point> or a Point given as `from` down to its coordinates. */
function resolveFrom(input: unknown): unknown {
    let from = input
    if (
        isObject(from) &&
        "type" in from &&
        from.type === "Feature" &&
        "geometry" in from &&
        isObject(from.geometry) &&
        "type" in from.geometry &&
        from.geometry.type === "Point"
    ) {
        from = from.geometry
    }
    if (
        isObject(from) &&
        "type" in from &&
        from.type === "Point" &&
        "coordinates" in from &&
        isList(from.coordinates) &&
        from.coordinates.length === 2
    ) {
        from = from.coordinates
    }
    return from
}

function isAt(position: Position | undefined, from: readonly unknown[]): boolean {
    if (position === undefined) throw new TypeError("The LineString has no coordinates")
    return position.at(0) === from.at(0) && position.at(1) === from.at(1)
}

function isEventAt(e: { lngLat?: LngLatValue }, position: Position | undefined): boolean {
    return position !== undefined && isEventAtCoordinates(e, position)
}

/**
 * Draws a new LineString, or continues an existing one (`featureId`) from
 * either of its ends (`from`), then switches to simple_select with the line
 * selected.
 */
export default class DrawLineString extends Mode {
    readonly #line: LineString
    #currentVertexPosition: number
    readonly #direction: Direction

    constructor(ctx: ModeContext, opts: ChangeModeOptions) {
        super(ctx)
        const featureId = opts.featureId

        let direction: Direction = "forward"
        if (featureId) {
            const feature = this.getFeature(featureId)
            if (!feature) {
                throw new Error("Could not find a feature with the provided featureId")
            }
            const from = resolveFrom(opts.from)
            if (!from || !isList(from)) {
                throw new Error("Please use the `from` property to indicate which point to continue the line from")
            }
            if (!(feature instanceof LineString)) {
                throw new TypeError("The provided featureId does not refer to a LineString")
            }
            this.#line = feature
            const lastCoord = feature.coordinates.length - 1
            if (isAt(feature.coordinates.at(lastCoord), from)) {
                this.#currentVertexPosition = lastCoord + 1
                // add one new coordinate to continue from
                const [lng = Number.NaN, lat = Number.NaN] = feature.coordinates.at(lastCoord) ?? []
                feature.addCoordinate(this.#currentVertexPosition, lng, lat)
            } else if (isAt(feature.coordinates.at(0), from)) {
                direction = "backwards"
                this.#currentVertexPosition = 0
                // add one new coordinate to continue from
                const [lng = Number.NaN, lat = Number.NaN] = feature.coordinates.at(0) ?? []
                feature.addCoordinate(this.#currentVertexPosition, lng, lat)
            } else {
                throw new Error(
                    "`from` should match the point at either the start or the end of the provided LineString",
                )
            }
        } else {
            this.#line = this.newFeature({
                type: Constants.geojsonTypes.FEATURE,
                properties: {},
                geometry: {
                    type: Constants.geojsonTypes.LINE_STRING,
                    coordinates: [],
                },
            })
            this.#currentVertexPosition = 0
            this.addFeature(this.#line)
        }
        this.#direction = direction

        this.clearSelectedFeatures()
        doubleClickZoom.disable(this)
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.activateUIButton(Constants.types.LINE)
        this.setActionableState({
            trash: true,
        })
    }

    #clickAnywhere(e: DrawPointerEvent): void {
        if (
            (this.#currentVertexPosition > 0 &&
                isEventAt(e, elementAt(this.#line.coordinates, this.#currentVertexPosition - 1))) ||
            (this.#direction === "backwards" &&
                isEventAt(e, elementAt(this.#line.coordinates, this.#currentVertexPosition + 1)))
        ) {
            this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [this.#line.id] })
            return
        }
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.#line.updateCoordinate(this.#currentVertexPosition, e.lngLat.lng, e.lngLat.lat)
        if (this.#direction === "forward") {
            this.#currentVertexPosition++
            this.#line.updateCoordinate(this.#currentVertexPosition, e.lngLat.lng, e.lngLat.lat)
        } else {
            this.#line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat)
        }
    }

    #clickOnVertex(): void {
        this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [this.#line.id] })
    }

    #clickOrTap(e: DrawPointerEvent): void {
        if (CommonSelectors.isVertex(e)) {
            this.#clickOnVertex()
            return
        }
        this.#clickAnywhere(e)
    }

    onMouseMove(e: DrawMouseEvent): void {
        this.#line.updateCoordinate(this.#currentVertexPosition, e.lngLat.lng, e.lngLat.lat)
        if (CommonSelectors.isVertex(e)) {
            this.updateUIClasses({ mouse: Constants.cursors.POINTER })
        }
    }

    onClick(e: DrawMouseEvent): void {
        this.#clickOrTap(e)
    }

    onTap(e: DrawTouchEvent): void {
        this.#clickOrTap(e)
    }

    onKeyUp(e: DrawKeyboardEvent): void {
        if (CommonSelectors.isEnterKey(e)) {
            this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [this.#line.id] })
        } else if (CommonSelectors.isEscapeKey(e)) {
            this.deleteFeature([this.#line.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT)
        }
    }

    onStop(): void {
        doubleClickZoom.enable(this)
        this.activateUIButton()

        // check to see if we've deleted this feature
        if (this.getFeature(this.#line.id) === undefined) return

        //remove last added coordinate
        this.#line.removeCoordinate(`${this.#currentVertexPosition}`)
        if (this.#line.isValid()) {
            fireDrawEvent(this.map, Constants.events.CREATE, {
                features: [this.#line.toGeoJSON()],
            })
        } else {
            this.deleteFeature([this.#line.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true })
        }
    }

    onTrash(): void {
        this.deleteFeature([this.#line.id], { silent: true })
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    }

    toDisplayFeatures(geojson: DrawRenderFeature, display: RenderPush): void {
        const isActiveLine = geojson.properties.id === this.#line.id
        geojson.properties.active = isActiveLine ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        if (!isActiveLine) {
            display(geojson)
            return
        }
        const geometry = geojson.geometry
        // The active line is always rendered from a LineString
        if (geometry.type !== Constants.geojsonTypes.LINE_STRING) {
            display(geojson)
            return
        }
        // Only render the line if it has at least one real coordinate
        if (geometry.coordinates.length < 2) return
        geojson.properties.meta = Constants.meta.FEATURE
        const vertexIndex = this.#direction === "forward" ? geometry.coordinates.length - 2 : 1
        const vertex = elementAt(geometry.coordinates, vertexIndex)
        if (vertex === undefined) throw new RangeError(`The line has no coordinate at ${vertexIndex}`)
        display(createVertex(this.#line.id, vertex, `${vertexIndex}`, false))

        display(geojson)
    }
}

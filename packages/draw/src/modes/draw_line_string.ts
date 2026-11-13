import type { Position } from "geojson"
import * as CommonSelectors from "../lib/common_selectors"
import isEventAtCoordinates from "../lib/is_event_at_coordinates"
import doubleClickZoom from "../lib/double_click_zoom"
import elementAt from "../lib/element_at"
import * as Constants from "../constants"
import createVertex from "../lib/create_vertex"
import LineString from "../feature_types/line_string"
import { fireDrawEvent } from "../map-events"
import type { DrawPointerEvent, FeatureId, LngLatValue } from "../types"
import type { DrawMode } from "./mode_interface"

type Direction = "forward" | "backwards"

export interface DrawLineStringOptions {
    /** A line to continue drawing */
    featureId?: FeatureId
    /** The end of the line to continue from: a position, a Point or a Feature<Point> */
    from?: unknown
}

export interface DrawLineStringState {
    line: LineString
    currentVertexPosition: number
    direction: Direction
}

interface DrawLineStringHelpers {
    clickAnywhere(state: DrawLineStringState, e: DrawPointerEvent): void
    clickOnVertex(state: DrawLineStringState): void
    clickOrTap(state: DrawLineStringState, e: DrawPointerEvent): void
}

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

const DrawLineString: DrawMode<DrawLineStringState, DrawLineStringOptions | undefined, DrawLineStringHelpers> = {
    onSetup(options) {
        const opts = options || {}
        const featureId = opts.featureId

        let line: LineString
        let currentVertexPosition: number
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
            line = feature
            const lastCoord = line.coordinates.length - 1
            if (isAt(line.coordinates.at(lastCoord), from)) {
                currentVertexPosition = lastCoord + 1
                // add one new coordinate to continue from
                const [lng = Number.NaN, lat = Number.NaN] = line.coordinates.at(lastCoord) ?? []
                line.addCoordinate(currentVertexPosition, lng, lat)
            } else if (isAt(line.coordinates.at(0), from)) {
                direction = "backwards"
                currentVertexPosition = 0
                // add one new coordinate to continue from
                const [lng = Number.NaN, lat = Number.NaN] = line.coordinates.at(0) ?? []
                line.addCoordinate(currentVertexPosition, lng, lat)
            } else {
                throw new Error(
                    "`from` should match the point at either the start or the end of the provided LineString",
                )
            }
        } else {
            line = this.newFeature({
                type: Constants.geojsonTypes.FEATURE,
                properties: {},
                geometry: {
                    type: Constants.geojsonTypes.LINE_STRING,
                    coordinates: [],
                },
            })
            currentVertexPosition = 0
            this.addFeature(line)
        }

        this.clearSelectedFeatures()
        doubleClickZoom.disable(this)
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.activateUIButton(Constants.types.LINE)
        this.setActionableState({
            trash: true,
        })

        return {
            line,
            currentVertexPosition,
            direction,
        }
    },

    clickAnywhere(state, e) {
        if (
            (state.currentVertexPosition > 0 &&
                isEventAt(e, elementAt(state.line.coordinates, state.currentVertexPosition - 1))) ||
            (state.direction === "backwards" &&
                isEventAt(e, elementAt(state.line.coordinates, state.currentVertexPosition + 1)))
        ) {
            return this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.line.id] })
        }
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat)
        if (state.direction === "forward") {
            state.currentVertexPosition++
            state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat)
        } else {
            state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat)
        }
    },

    clickOnVertex(state) {
        return this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.line.id] })
    },

    onMouseMove(state, e) {
        state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat)
        if (CommonSelectors.isVertex(e)) {
            this.updateUIClasses({ mouse: Constants.cursors.POINTER })
        }
    },

    clickOrTap(state, e) {
        if (CommonSelectors.isVertex(e)) return this.clickOnVertex(state)
        this.clickAnywhere(state, e)
    },

    onClick(state, e) {
        return this.clickOrTap(state, e)
    },

    onTap(state, e) {
        return this.clickOrTap(state, e)
    },

    onKeyUp(state, e) {
        if (CommonSelectors.isEnterKey(e)) {
            this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.line.id] })
        } else if (CommonSelectors.isEscapeKey(e)) {
            this.deleteFeature([state.line.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT)
        }
    },

    onStop(state) {
        doubleClickZoom.enable(this)
        this.activateUIButton()

        // check to see if we've deleted this feature
        if (this.getFeature(state.line.id) === undefined) return

        //remove last added coordinate
        state.line.removeCoordinate(`${state.currentVertexPosition}`)
        if (state.line.isValid()) {
            fireDrawEvent(this.map, Constants.events.CREATE, {
                features: [state.line.toGeoJSON()],
            })
        } else {
            this.deleteFeature([state.line.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true })
        }
    },

    onTrash(state) {
        this.deleteFeature([state.line.id], { silent: true })
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    },

    toDisplayFeatures(state, geojson, display) {
        const isActiveLine = geojson.properties.id === state.line.id
        geojson.properties.active = isActiveLine ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        if (!isActiveLine) return display(geojson)
        const geometry = geojson.geometry
        // The active line is always rendered from a LineString
        if (geometry.type !== Constants.geojsonTypes.LINE_STRING) return display(geojson)
        // Only render the line if it has at least one real coordinate
        if (geometry.coordinates.length < 2) return
        geojson.properties.meta = Constants.meta.FEATURE
        const vertexIndex = state.direction === "forward" ? geometry.coordinates.length - 2 : 1
        const vertex = elementAt(geometry.coordinates, vertexIndex)
        if (vertex === undefined) throw new RangeError(`The line has no coordinate at ${vertexIndex}`)
        display(createVertex(state.line.id, vertex, `${vertexIndex}`, false))

        display(geojson)
    },
}

export default DrawLineString

import type { Position } from "geojson"
import * as CommonSelectors from "../lib/common_selectors"
import doubleClickZoom from "../lib/double_click_zoom"
import elementAt from "../lib/element_at"
import * as Constants from "../constants"
import isEventAtCoordinates from "../lib/is_event_at_coordinates"
import createVertex from "../lib/create_vertex"
import type Polygon from "../feature_types/polygon"
import type { RenderPush } from "../lib/mode_handler"
import { fireDrawEvent } from "../map-events"
import type { DrawKeyboardEvent, DrawMouseEvent, DrawPointerEvent, DrawRenderFeature, DrawTouchEvent } from "../types"
import Mode, { type ModeContext } from "./mode"

/** A position of the first ring, which must be there. */
function requirePosition(ring: Position[] | undefined, index: number): Position {
    const position = ring === undefined ? undefined : elementAt(ring, index)
    if (position === undefined) throw new RangeError(`The polygon has no position at 0.${index}`)
    return position
}

/** Draws a polygon vertex by vertex, then switches to simple_select with the polygon selected. */
export default class DrawPolygon extends Mode {
    readonly #polygon: Polygon
    #currentVertexPosition = 0

    constructor(ctx: ModeContext) {
        super(ctx)
        this.#polygon = this.newFeature({
            type: Constants.geojsonTypes.FEATURE,
            properties: {},
            geometry: {
                type: Constants.geojsonTypes.POLYGON,
                coordinates: [[]],
            },
        })

        this.addFeature(this.#polygon)

        this.clearSelectedFeatures()
        doubleClickZoom.disable(this)
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.activateUIButton(Constants.types.POLYGON)
        this.setActionableState({
            trash: true,
        })
    }

    #clickAnywhere(e: DrawPointerEvent): void {
        if (
            this.#currentVertexPosition > 0 &&
            isEventAtCoordinates(e, requirePosition(this.#polygon.coordinates.at(0), this.#currentVertexPosition - 1))
        ) {
            this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [this.#polygon.id] })
            return
        }
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.#polygon.updateCoordinate(`0.${this.#currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat)
        this.#currentVertexPosition++
        this.#polygon.updateCoordinate(`0.${this.#currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat)
    }

    #clickOnVertex(): void {
        this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [this.#polygon.id] })
    }

    onMouseMove(e: DrawMouseEvent): void {
        this.#polygon.updateCoordinate(`0.${this.#currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat)
        if (CommonSelectors.isVertex(e)) {
            this.updateUIClasses({ mouse: Constants.cursors.POINTER })
        }
    }

    #clickOrTap(e: DrawPointerEvent): void {
        if (CommonSelectors.isVertex(e)) {
            this.#clickOnVertex()
            return
        }
        this.#clickAnywhere(e)
    }

    onClick(e: DrawMouseEvent): void {
        this.#clickOrTap(e)
    }

    onTap(e: DrawTouchEvent): void {
        this.#clickOrTap(e)
    }

    onKeyUp(e: DrawKeyboardEvent): void {
        if (CommonSelectors.isEscapeKey(e)) {
            this.deleteFeature([this.#polygon.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT)
        } else if (CommonSelectors.isEnterKey(e)) {
            this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [this.#polygon.id] })
        }
    }

    onStop(): void {
        this.updateUIClasses({ mouse: Constants.cursors.NONE })
        doubleClickZoom.enable(this)
        this.activateUIButton()

        // check to see if we've deleted this feature
        if (this.getFeature(this.#polygon.id) === undefined) return

        //remove last added coordinate
        this.#polygon.removeCoordinate(`0.${this.#currentVertexPosition}`)
        if (this.#polygon.isValid()) {
            fireDrawEvent(this.map, Constants.events.CREATE, {
                features: [this.#polygon.toGeoJSON()],
            })
        } else {
            this.deleteFeature([this.#polygon.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true })
        }
    }

    toDisplayFeatures(geojson: DrawRenderFeature, display: RenderPush): void {
        const isActivePolygon = geojson.properties.id === this.#polygon.id
        geojson.properties.active = isActivePolygon ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        if (!isActivePolygon) {
            display(geojson)
            return
        }

        const geometry = geojson.geometry
        // The active polygon is always rendered from a Polygon
        if (geometry.type !== Constants.geojsonTypes.POLYGON) {
            display(geojson)
            return
        }

        // Don't render a polygon until it has two positions
        // (and a 3rd which is just the first repeated)
        const ring = geometry.coordinates.at(0)
        if (ring === undefined) return

        const coordinateCount = ring.length
        // 2 coordinates after selecting a draw type
        // 3 after creating the first point
        if (coordinateCount < 3) {
            return
        }
        geojson.properties.meta = Constants.meta.FEATURE
        display(createVertex(this.#polygon.id, requirePosition(ring, 0), "0.0", false))
        if (coordinateCount > 3) {
            // Add a start position marker to the map, clicking on this will finish the feature
            // This should only be shown when we're in a valid spot
            const endPos = ring.length - 3
            display(createVertex(this.#polygon.id, requirePosition(ring, endPos), `0.${endPos}`, false))
        }
        if (coordinateCount <= 4) {
            // If we've only drawn two positions (plus the closer),
            // make a LineString instead of a Polygon
            const [firstLng = Number.NaN, firstLat = Number.NaN] = requirePosition(ring, 0)
            const [secondLng = Number.NaN, secondLat = Number.NaN] = requirePosition(ring, 1)
            const lineCoordinates = [
                [firstLng, firstLat],
                [secondLng, secondLat],
            ]
            // create an initial vertex so that we can track the first point on mobile devices
            display({
                type: Constants.geojsonTypes.FEATURE,
                properties: geojson.properties,
                geometry: {
                    coordinates: lineCoordinates,
                    type: Constants.geojsonTypes.LINE_STRING,
                },
            })
            if (coordinateCount === 3) {
                return
            }
        }
        // render the Polygon
        display(geojson)
    }

    onTrash(): void {
        this.deleteFeature([this.#polygon.id], { silent: true })
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    }
}

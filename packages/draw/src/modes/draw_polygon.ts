import type { Position } from "geojson"
import * as CommonSelectors from "../lib/common_selectors"
import doubleClickZoom from "../lib/double_click_zoom"
import elementAt from "../lib/element_at"
import * as Constants from "../constants"
import isEventAtCoordinates from "../lib/is_event_at_coordinates"
import createVertex from "../lib/create_vertex"
import type Polygon from "../feature_types/polygon"
import { fireDrawEvent } from "../map-events"
import type { DrawPointerEvent } from "../types"
import type { DrawMode } from "./mode_interface"

export interface DrawPolygonState {
    polygon: Polygon
    currentVertexPosition: number
}

interface DrawPolygonHelpers {
    clickAnywhere(state: DrawPolygonState, e: DrawPointerEvent): void
    clickOnVertex(state: DrawPolygonState): void
    clickOrTap(state: DrawPolygonState, e: DrawPointerEvent): void
}

/** A position of the first ring, which must be there. */
function requirePosition(ring: Position[] | undefined, index: number): Position {
    const position = ring === undefined ? undefined : elementAt(ring, index)
    if (position === undefined) throw new RangeError(`The polygon has no position at 0.${index}`)
    return position
}

const DrawPolygon: DrawMode<DrawPolygonState, unknown, DrawPolygonHelpers> = {
    onSetup() {
        const polygon = this.newFeature({
            type: Constants.geojsonTypes.FEATURE,
            properties: {},
            geometry: {
                type: Constants.geojsonTypes.POLYGON,
                coordinates: [[]],
            },
        })

        this.addFeature(polygon)

        this.clearSelectedFeatures()
        doubleClickZoom.disable(this)
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.activateUIButton(Constants.types.POLYGON)
        this.setActionableState({
            trash: true,
        })

        return {
            polygon,
            currentVertexPosition: 0,
        }
    },

    clickAnywhere(state, e) {
        if (
            state.currentVertexPosition > 0 &&
            isEventAtCoordinates(e, requirePosition(state.polygon.coordinates.at(0), state.currentVertexPosition - 1))
        ) {
            return this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.polygon.id] })
        }
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat)
        state.currentVertexPosition++
        state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat)
    },

    clickOnVertex(state) {
        return this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.polygon.id] })
    },

    onMouseMove(state, e) {
        state.polygon.updateCoordinate(`0.${state.currentVertexPosition}`, e.lngLat.lng, e.lngLat.lat)
        if (CommonSelectors.isVertex(e)) {
            this.updateUIClasses({ mouse: Constants.cursors.POINTER })
        }
    },

    clickOrTap(state, e) {
        if (CommonSelectors.isVertex(e)) return this.clickOnVertex(state)
        return this.clickAnywhere(state, e)
    },

    onClick(state, e) {
        return this.clickOrTap(state, e)
    },

    onTap(state, e) {
        return this.clickOrTap(state, e)
    },

    onKeyUp(state, e) {
        if (CommonSelectors.isEscapeKey(e)) {
            this.deleteFeature([state.polygon.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT)
        } else if (CommonSelectors.isEnterKey(e)) {
            this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.polygon.id] })
        }
    },

    onStop(state) {
        this.updateUIClasses({ mouse: Constants.cursors.NONE })
        doubleClickZoom.enable(this)
        this.activateUIButton()

        // check to see if we've deleted this feature
        if (this.getFeature(state.polygon.id) === undefined) return

        //remove last added coordinate
        state.polygon.removeCoordinate(`0.${state.currentVertexPosition}`)
        if (state.polygon.isValid()) {
            fireDrawEvent(this.map, Constants.events.CREATE, {
                features: [state.polygon.toGeoJSON()],
            })
        } else {
            this.deleteFeature([state.polygon.id], { silent: true })
            this.changeMode(Constants.modes.SIMPLE_SELECT, {}, { silent: true })
        }
    },

    toDisplayFeatures(state, geojson, display) {
        const isActivePolygon = geojson.properties.id === state.polygon.id
        geojson.properties.active = isActivePolygon ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        if (!isActivePolygon) return display(geojson)

        const geometry = geojson.geometry
        // The active polygon is always rendered from a Polygon
        if (geometry.type !== Constants.geojsonTypes.POLYGON) return display(geojson)

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
        display(createVertex(state.polygon.id, requirePosition(ring, 0), "0.0", false))
        if (coordinateCount > 3) {
            // Add a start position marker to the map, clicking on this will finish the feature
            // This should only be shown when we're in a valid spot
            const endPos = ring.length - 3
            display(createVertex(state.polygon.id, requirePosition(ring, endPos), `0.${endPos}`, false))
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
        return display(geojson)
    },

    onTrash(state) {
        this.deleteFeature([state.polygon.id], { silent: true })
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    },
}

export default DrawPolygon

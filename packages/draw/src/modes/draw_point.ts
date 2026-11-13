import * as CommonSelectors from "../lib/common_selectors"
import * as Constants from "../constants"
import type Point from "../feature_types/point"
import type { DrawPointerEvent } from "../types"
import { fireDrawEvent } from "../map-events"
import type { DrawMode } from "./mode_interface"

export interface DrawPointState {
    point: Point
}

interface DrawPointHelpers {
    stopDrawingAndRemove(state: DrawPointState): void
    placePoint(state: DrawPointState, e: DrawPointerEvent): void
}

const DrawPoint: DrawMode<DrawPointState, unknown, DrawPointHelpers> = {
    onSetup() {
        const point = this.newFeature({
            type: Constants.geojsonTypes.FEATURE,
            properties: {},
            geometry: {
                type: Constants.geojsonTypes.POINT,
                coordinates: [],
            },
        })

        this.addFeature(point)

        this.clearSelectedFeatures()
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.activateUIButton(Constants.types.POINT)

        this.setActionableState({
            trash: true,
        })

        return { point }
    },

    stopDrawingAndRemove(state) {
        this.deleteFeature([state.point.id], { silent: true })
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    },

    placePoint(state, e) {
        this.updateUIClasses({ mouse: Constants.cursors.MOVE })
        state.point.updateCoordinate("", e.lngLat.lng, e.lngLat.lat)
        fireDrawEvent(this.map, Constants.events.CREATE, {
            features: [state.point.toGeoJSON()],
        })
        this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.point.id] })
    },

    onClick(state, e) {
        this.placePoint(state, e)
    },

    onTap(state, e) {
        this.placePoint(state, e)
    },

    onStop(state) {
        this.activateUIButton()
        if (!state.point.getCoordinate().length) {
            this.deleteFeature([state.point.id], { silent: true })
        }
    },

    toDisplayFeatures(state, geojson, display) {
        // Never render the point we're drawing
        const isActivePoint = geojson.properties.id === state.point.id
        geojson.properties.active = isActivePoint ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        if (!isActivePoint) return display(geojson)
    },

    onTrash(state) {
        this.stopDrawingAndRemove(state)
    },

    onKeyUp(state, e) {
        if (CommonSelectors.isEscapeKey(e) || CommonSelectors.isEnterKey(e)) {
            return this.stopDrawingAndRemove(state)
        }
    },
}

export default DrawPoint

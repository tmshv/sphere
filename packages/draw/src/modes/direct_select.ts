import { noTarget, isOfMetaType, isActiveFeature, isInactiveFeature, isShiftDown } from "../lib/common_selectors"
import createSupplementaryPoints from "../lib/create_supplementary_points"
import constrainFeatureMovement from "../lib/constrain_feature_movement"
import doubleClickZoom from "../lib/double_click_zoom"
import * as Constants from "../constants"
import moveFeatures from "../lib/move_features"
import { type DrawFeature, requireFeature } from "../feature_types/draw_feature"
import { fireDrawEvent } from "../map-events"
import type { DrawFeatureTarget, DrawPointerEvent, FeatureId, LngLatValue, SelectedCoordinate } from "../types"
import type { DrawMode } from "./mode_interface"

const isVertex = isOfMetaType(Constants.meta.VERTEX)
const isMidpoint = isOfMetaType(Constants.meta.MIDPOINT)

export interface DirectSelectOptions {
    featureId: FeatureId
    coordPath?: string | null
    startPos?: LngLatValue
}

/** A feature direct select can edit: anything but a point. */
type EditableFeature = Exclude<DrawFeature, { type: "Point" }>

export interface DirectSelectState {
    featureId: FeatureId
    feature: EditableFeature
    dragMoveLocation: LngLatValue | null
    dragMoving: boolean
    canDragMove: boolean
    selectedCoordPaths: string[]
}

interface DirectSelectHelpers {
    fireUpdate(): void
    fireActionable(state: DirectSelectState): void
    startDragging(state: DirectSelectState, e: DrawPointerEvent): void
    stopDragging(state: DirectSelectState): void
    onVertex(state: DirectSelectState, e: DrawPointerEvent): void
    onMidpoint(state: DirectSelectState, e: DrawPointerEvent): void
    pathsToCoordinates(featureId: FeatureId, paths: string[]): SelectedCoordinate[]
    onFeature(state: DirectSelectState, e: DrawPointerEvent): void
    dragFeature(state: DirectSelectState, e: DrawPointerEvent, delta: LngLatValue): void
    dragVertex(state: DirectSelectState, e: DrawPointerEvent, delta: LngLatValue): void
    clickNoTarget(state: DirectSelectState, e: DrawPointerEvent): void
    clickInactive(state: DirectSelectState, e: DrawPointerEvent): void
    clickActiveFeature(state: DirectSelectState, e: DrawPointerEvent): void
    pointerDown(state: DirectSelectState, e: DrawPointerEvent): void
    pointerUp(state: DirectSelectState): void
}

/** The properties of the rendered feature under the pointer, which the selectors already checked is there. */
function targetProperties(e: { featureTarget?: DrawFeatureTarget }) {
    if (e.featureTarget === undefined) throw new TypeError("The event has no feature target")
    return e.featureTarget.properties
}

function requirePath(path: string | null | undefined): string {
    if (typeof path !== "string") throw new TypeError("The vertex has no coordinate path")
    return path
}

const DirectSelect: DrawMode<DirectSelectState, DirectSelectOptions, DirectSelectHelpers> = {
    // INTERNAL FUCNTIONS

    fireUpdate() {
        fireDrawEvent(this.map, Constants.events.UPDATE, {
            action: Constants.updateActions.CHANGE_COORDINATES,
            features: this.getSelected().map(f => requireFeature(f).toGeoJSON()),
        })
    },

    fireActionable(state) {
        this.setActionableState({
            combineFeatures: false,
            uncombineFeatures: false,
            trash: state.selectedCoordPaths.length > 0,
        })
    },

    startDragging(state, e) {
        this.map.dragPan.disable()
        state.canDragMove = true
        state.dragMoveLocation = e.lngLat
    },

    stopDragging(state) {
        this.map.dragPan.enable()
        state.dragMoving = false
        state.canDragMove = false
        state.dragMoveLocation = null
    },

    onVertex(state, e) {
        this.startDragging(state, e)
        const about = targetProperties(e)
        const coordPath = requirePath(about.coord_path)
        const selectedIndex = state.selectedCoordPaths.indexOf(coordPath)
        if (!isShiftDown(e) && selectedIndex === -1) {
            state.selectedCoordPaths = [coordPath]
        } else if (isShiftDown(e) && selectedIndex === -1) {
            state.selectedCoordPaths.push(coordPath)
        }

        const selectedCoordinates = this.pathsToCoordinates(state.featureId, state.selectedCoordPaths)
        this.setSelectedCoordinates(selectedCoordinates)
    },

    onMidpoint(state, e) {
        this.startDragging(state, e)
        const about = targetProperties(e)
        const coordPath = requirePath(about.coord_path)
        state.feature.addCoordinate(coordPath, about.lng ?? Number.NaN, about.lat ?? Number.NaN)
        this.fireUpdate()
        state.selectedCoordPaths = [coordPath]
    },

    pathsToCoordinates(featureId, paths) {
        return paths.map(coord_path => ({ feature_id: featureId, coord_path }))
    },

    onFeature(state, e) {
        if (state.selectedCoordPaths.length === 0) this.startDragging(state, e)
        else this.stopDragging(state)
    },

    dragFeature(state, e, delta) {
        moveFeatures(this.getSelected().map(requireFeature), delta)
        state.dragMoveLocation = e.lngLat
    },

    dragVertex(state, _, delta) {
        const selectedCoords = state.selectedCoordPaths.map(coord_path => state.feature.getCoordinate(coord_path))
        const selectedCoordPoints = selectedCoords.map(coords => ({
            type: Constants.geojsonTypes.FEATURE,
            properties: {},
            geometry: {
                type: Constants.geojsonTypes.POINT,
                coordinates: coords,
            },
        }))

        const constrainedDelta = constrainFeatureMovement(selectedCoordPoints, delta)
        for (const [i, coord] of selectedCoords.entries()) {
            const [lng = Number.NaN, lat = Number.NaN] = coord
            const path = state.selectedCoordPaths.at(i)
            if (path === undefined) continue
            state.feature.updateCoordinate(path, lng + constrainedDelta.lng, lat + constrainedDelta.lat)
        }
    },

    clickNoTarget() {
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    },

    clickInactive() {
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    },

    clickActiveFeature(state) {
        state.selectedCoordPaths = []
        this.clearSelectedCoordinates()
        state.feature.changed()
    },

    // EXTERNAL FUNCTIONS

    onSetup(opts) {
        const featureId = opts.featureId
        const feature = this.getFeature(featureId)

        if (!feature) {
            throw new Error("You must provide a featureId to enter direct_select mode")
        }

        if (feature.type === Constants.geojsonTypes.POINT) {
            throw new TypeError("direct_select mode doesn't handle point features")
        }

        const state: DirectSelectState = {
            featureId,
            feature,
            dragMoveLocation: opts.startPos || null,
            dragMoving: false,
            canDragMove: false,
            selectedCoordPaths: opts.coordPath ? [opts.coordPath] : [],
        }

        this.setSelectedCoordinates(this.pathsToCoordinates(featureId, state.selectedCoordPaths))
        this.setSelected(featureId)
        doubleClickZoom.disable(this)

        this.setActionableState({
            trash: true,
        })

        return state
    },

    onStop() {
        doubleClickZoom.enable(this)
        this.clearSelectedCoordinates()
    },

    toDisplayFeatures(state, geojson, push) {
        if (state.featureId === geojson.properties.id) {
            geojson.properties.active = Constants.activeStates.ACTIVE
            push(geojson)
            const points = createSupplementaryPoints(geojson, {
                midpoints: true,
                selectedPaths: state.selectedCoordPaths,
            })
            for (const point of points) {
                push(point)
            }
        } else {
            geojson.properties.active = Constants.activeStates.INACTIVE
            push(geojson)
        }
        this.fireActionable(state)
    },

    onTrash(state) {
        // Uses number-aware sorting to make sure '9' < '10'. Comparison is reversed because we want them
        // in reverse order so that we can remove by index safely.
        const coordPaths = state.selectedCoordPaths.sort((a, b) => b.localeCompare(a, "en", { numeric: true }))
        for (const id of coordPaths) {
            state.feature.removeCoordinate(id)
        }
        this.fireUpdate()
        state.selectedCoordPaths = []
        this.clearSelectedCoordinates()
        this.fireActionable(state)
        if (state.feature.isValid() === false) {
            this.deleteFeature([state.featureId])
            this.changeMode(Constants.modes.SIMPLE_SELECT, {})
        }
    },

    onMouseMove(state, e) {
        // On mousemove that is not a drag, stop vertex movement.
        const isFeature = isActiveFeature(e)
        const onVertex = isVertex(e)
        const isMidPoint = isMidpoint(e)
        const noCoords = state.selectedCoordPaths.length === 0
        if (isFeature && noCoords) this.updateUIClasses({ mouse: Constants.cursors.MOVE })
        else if (onVertex && !noCoords) this.updateUIClasses({ mouse: Constants.cursors.MOVE })
        else this.updateUIClasses({ mouse: Constants.cursors.NONE })

        const isDraggableItem = onVertex || isFeature || isMidPoint
        if (isDraggableItem && state.dragMoving) this.fireUpdate()

        this.stopDragging(state)

        // Skip render
        return true
    },

    onMouseOut(state) {
        // As soon as you mouse leaves the canvas, update the feature
        if (state.dragMoving) this.fireUpdate()

        // Skip render
        return true
    },

    pointerDown(state, e) {
        if (isVertex(e)) return this.onVertex(state, e)
        if (isActiveFeature(e)) return this.onFeature(state, e)
        if (isMidpoint(e)) return this.onMidpoint(state, e)
    },

    onTouchStart(state, e) {
        return this.pointerDown(state, e)
    },

    onMouseDown(state, e) {
        return this.pointerDown(state, e)
    },

    onDrag(state, e) {
        if (state.canDragMove !== true) return
        state.dragMoving = true
        e.originalEvent.stopPropagation()

        const location = state.dragMoveLocation
        if (location === null) throw new TypeError("Drag move has no start location")
        const delta = {
            lng: e.lngLat.lng - location.lng,
            lat: e.lngLat.lat - location.lat,
        }
        if (state.selectedCoordPaths.length > 0) this.dragVertex(state, e, delta)
        else this.dragFeature(state, e, delta)

        state.dragMoveLocation = e.lngLat
    },

    onClick(state, e) {
        if (noTarget(e)) return this.clickNoTarget(state, e)
        if (isActiveFeature(e)) return this.clickActiveFeature(state, e)
        if (isInactiveFeature(e)) return this.clickInactive(state, e)
        this.stopDragging(state)
    },

    onTap(state, e) {
        if (noTarget(e)) return this.clickNoTarget(state, e)
        if (isActiveFeature(e)) return this.clickActiveFeature(state, e)
        if (isInactiveFeature(e)) return this.clickInactive(state, e)
    },

    pointerUp(state) {
        if (state.dragMoving) {
            this.fireUpdate()
        }
        this.stopDragging(state)
    },

    onTouchEnd(state) {
        return this.pointerUp(state)
    },

    onMouseUp(state) {
        return this.pointerUp(state)
    },
}

export default DirectSelect

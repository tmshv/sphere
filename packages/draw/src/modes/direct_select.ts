import { noTarget, isOfMetaType, isActiveFeature, isInactiveFeature, isShiftDown } from "../lib/common_selectors"
import createSupplementaryPoints from "../lib/create_supplementary_points"
import constrainFeatureMovement from "../lib/constrain_feature_movement"
import doubleClickZoom from "../lib/double_click_zoom"
import * as Constants from "../constants"
import moveFeatures from "../lib/move_features"
import type { DrawFeature } from "../feature_types/draw_feature"
import type { RenderPush } from "../lib/mode_handler"
import { fireDrawEvent } from "../map-events"
import type {
    ChangeModeOptions,
    DrawFeatureTarget,
    DrawMouseEvent,
    DrawPointerEvent,
    DrawRenderFeature,
    DrawTouchEvent,
    FeatureId,
    HandlerResult,
    LngLatValue,
    SelectedCoordinate,
} from "../types"
import Mode, { type ModeContext } from "./mode"

const isVertex = isOfMetaType(Constants.meta.VERTEX)
const isMidpoint = isOfMetaType(Constants.meta.MIDPOINT)

/** A feature direct select can edit: anything but a point. */
type EditableFeature = Exclude<DrawFeature, { type: "Point" }>

/** The properties of the rendered feature under the pointer, which the selectors already checked is there. */
function targetProperties(e: { featureTarget?: DrawFeatureTarget }) {
    if (e.featureTarget === undefined) throw new TypeError("The event has no feature target")
    return e.featureTarget.properties
}

function requirePath(path: string | null | undefined): string {
    if (typeof path !== "string") throw new TypeError("The vertex has no coordinate path")
    return path
}

/** Edits the vertices of one feature: select, drag, add at midpoints and delete them. */
export default class DirectSelect extends Mode {
    readonly #featureId: FeatureId
    readonly #feature: EditableFeature
    #dragMoveLocation: LngLatValue | null
    #dragMoving = false
    #canDragMove = false
    #selectedCoordPaths: string[]

    constructor(ctx: ModeContext, opts: ChangeModeOptions) {
        super(ctx)
        const featureId = opts.featureId
        const feature = featureId === undefined ? undefined : this.getFeature(featureId)

        if (featureId === undefined || !feature) {
            throw new Error("You must provide a featureId to enter direct_select mode")
        }

        if (feature.type === Constants.geojsonTypes.POINT) {
            throw new TypeError("direct_select mode doesn't handle point features")
        }

        this.#featureId = featureId
        this.#feature = feature
        this.#dragMoveLocation = opts.startPos || null
        this.#selectedCoordPaths = opts.coordPath ? [opts.coordPath] : []

        this.setSelectedCoordinates(this.#pathsToCoordinates(featureId, this.#selectedCoordPaths))
        this.setSelected(featureId)
        doubleClickZoom.disable(this)

        this.setActionableState({
            trash: true,
        })
    }

    #fireUpdate(): void {
        fireDrawEvent(this.map, Constants.events.UPDATE, {
            action: Constants.updateActions.CHANGE_COORDINATES,
            features: this.getSelected().map(f => f.toGeoJSON()),
        })
    }

    #fireActionable(): void {
        this.setActionableState({
            combineFeatures: false,
            uncombineFeatures: false,
            trash: this.#selectedCoordPaths.length > 0,
        })
    }

    #startDragging(e: DrawPointerEvent): void {
        this.map.dragPan.disable()
        this.#canDragMove = true
        this.#dragMoveLocation = e.lngLat
    }

    #stopDragging(): void {
        this.map.dragPan.enable()
        this.#dragMoving = false
        this.#canDragMove = false
        this.#dragMoveLocation = null
    }

    #onVertex(e: DrawPointerEvent): void {
        this.#startDragging(e)
        const about = targetProperties(e)
        const coordPath = requirePath(about.coord_path)
        const selectedIndex = this.#selectedCoordPaths.indexOf(coordPath)
        if (!isShiftDown(e) && selectedIndex === -1) {
            this.#selectedCoordPaths = [coordPath]
        } else if (isShiftDown(e) && selectedIndex === -1) {
            this.#selectedCoordPaths.push(coordPath)
        }

        const selectedCoordinates = this.#pathsToCoordinates(this.#featureId, this.#selectedCoordPaths)
        this.setSelectedCoordinates(selectedCoordinates)
    }

    #onMidpoint(e: DrawPointerEvent): void {
        this.#startDragging(e)
        const about = targetProperties(e)
        const coordPath = requirePath(about.coord_path)
        this.#feature.addCoordinate(coordPath, about.lng ?? Number.NaN, about.lat ?? Number.NaN)
        this.#fireUpdate()
        this.#selectedCoordPaths = [coordPath]
    }

    #pathsToCoordinates(featureId: FeatureId, paths: string[]): SelectedCoordinate[] {
        return paths.map(coord_path => ({ feature_id: featureId, coord_path }))
    }

    #onFeature(e: DrawPointerEvent): void {
        if (this.#selectedCoordPaths.length === 0) this.#startDragging(e)
        else this.#stopDragging()
    }

    #dragFeature(e: DrawPointerEvent, delta: LngLatValue): void {
        moveFeatures(this.getSelected(), delta)
        this.#dragMoveLocation = e.lngLat
    }

    #dragVertex(delta: LngLatValue): void {
        const selectedCoords = this.#selectedCoordPaths.map(coord_path => this.#feature.getCoordinate(coord_path))
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
            const path = this.#selectedCoordPaths.at(i)
            if (path === undefined) continue
            this.#feature.updateCoordinate(path, lng + constrainedDelta.lng, lat + constrainedDelta.lat)
        }
    }

    #clickNoTarget(): void {
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    }

    #clickInactive(): void {
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    }

    #clickActiveFeature(): void {
        this.#selectedCoordPaths = []
        this.clearSelectedCoordinates()
        this.#feature.changed()
    }

    #pointerDown(e: DrawPointerEvent): void {
        if (isVertex(e)) this.#onVertex(e)
        else if (isActiveFeature(e)) this.#onFeature(e)
        else if (isMidpoint(e)) this.#onMidpoint(e)
    }

    #pointerUp(): void {
        if (this.#dragMoving) {
            this.#fireUpdate()
        }
        this.#stopDragging()
    }

    onStop(): void {
        doubleClickZoom.enable(this)
        this.clearSelectedCoordinates()
    }

    toDisplayFeatures(geojson: DrawRenderFeature, push: RenderPush): void {
        if (this.#featureId === geojson.properties.id) {
            geojson.properties.active = Constants.activeStates.ACTIVE
            push(geojson)
            const points = createSupplementaryPoints(geojson, {
                midpoints: true,
                selectedPaths: this.#selectedCoordPaths,
            })
            for (const point of points) {
                push(point)
            }
        } else {
            geojson.properties.active = Constants.activeStates.INACTIVE
            push(geojson)
        }
        this.#fireActionable()
    }

    onTrash(): void {
        // Uses number-aware sorting to make sure '9' < '10'. Comparison is reversed because we want them
        // in reverse order so that we can remove by index safely.
        const coordPaths = this.#selectedCoordPaths.sort((a, b) => b.localeCompare(a, "en", { numeric: true }))
        for (const id of coordPaths) {
            this.#feature.removeCoordinate(id)
        }
        this.#fireUpdate()
        this.#selectedCoordPaths = []
        this.clearSelectedCoordinates()
        this.#fireActionable()
        if (this.#feature.isValid() === false) {
            this.deleteFeature([this.#featureId])
            this.changeMode(Constants.modes.SIMPLE_SELECT, {})
        }
    }

    onMouseMove(e: DrawMouseEvent): HandlerResult {
        // On mousemove that is not a drag, stop vertex movement.
        const isFeature = isActiveFeature(e)
        const onVertex = isVertex(e)
        const isMidPoint = isMidpoint(e)
        const noCoords = this.#selectedCoordPaths.length === 0
        if (isFeature && noCoords) this.updateUIClasses({ mouse: Constants.cursors.MOVE })
        else if (onVertex && !noCoords) this.updateUIClasses({ mouse: Constants.cursors.MOVE })
        else this.updateUIClasses({ mouse: Constants.cursors.NONE })

        const isDraggableItem = onVertex || isFeature || isMidPoint
        if (isDraggableItem && this.#dragMoving) this.#fireUpdate()

        this.#stopDragging()

        // Skip render
        return true
    }

    onMouseOut(): HandlerResult {
        // As soon as you mouse leaves the canvas, update the feature
        if (this.#dragMoving) this.#fireUpdate()

        // Skip render
        return true
    }

    onTouchStart(e: DrawTouchEvent): void {
        this.#pointerDown(e)
    }

    onMouseDown(e: DrawMouseEvent): void {
        this.#pointerDown(e)
    }

    onDrag(e: DrawPointerEvent): void {
        if (this.#canDragMove !== true) return
        this.#dragMoving = true
        e.originalEvent.stopPropagation()

        const location = this.#dragMoveLocation
        if (location === null) throw new TypeError("Drag move has no start location")
        const delta = {
            lng: e.lngLat.lng - location.lng,
            lat: e.lngLat.lat - location.lat,
        }
        if (this.#selectedCoordPaths.length > 0) this.#dragVertex(delta)
        else this.#dragFeature(e, delta)

        this.#dragMoveLocation = e.lngLat
    }

    onClick(e: DrawMouseEvent): void {
        if (noTarget(e)) this.#clickNoTarget()
        else if (isActiveFeature(e)) this.#clickActiveFeature()
        else if (isInactiveFeature(e)) this.#clickInactive()
        else this.#stopDragging()
    }

    onTap(e: DrawTouchEvent): void {
        if (noTarget(e)) this.#clickNoTarget()
        else if (isActiveFeature(e)) this.#clickActiveFeature()
        else if (isInactiveFeature(e)) this.#clickInactive()
    }

    onTouchEnd(): void {
        this.#pointerUp()
    }

    onMouseUp(): void {
        this.#pointerUp()
    }
}

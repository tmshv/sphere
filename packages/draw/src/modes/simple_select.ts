import type { Position } from "geojson"
import * as CommonSelectors from "../lib/common_selectors"
import mouseEventPoint from "../lib/mouse_event_point"
import createSupplementaryPoints from "../lib/create_supplementary_points"
import StringSet from "../lib/string_set"
import doubleClickZoom from "../lib/double_click_zoom"
import moveFeatures from "../lib/move_features"
import * as Constants from "../constants"
import { type DrawFeature, requireFeature } from "../feature_types/draw_feature"
import { fireDrawEvent } from "../map-events"
import type { RenderPush } from "../lib/mode_handler"
import type {
    AnyDrawGeometry,
    ChangeModeOptions,
    DrawFeatureTarget,
    DrawExportedFeature,
    DrawMouseEvent,
    DrawPointerEvent,
    DrawRenderFeature,
    DrawTouchEvent,
    FeatureId,
    HandlerResult,
    LngLatValue,
    ScreenPoint,
} from "../types"
import Mode, { type ModeContext } from "./mode"

/** An event over a rendered Draw feature. */
type TargetEvent = DrawPointerEvent & { featureTarget: DrawFeatureTarget }

function hasFeatureTarget(e: DrawPointerEvent): e is TargetEvent {
    return e.featureTarget !== undefined
}

/** The event, narrowed to one with a feature target, which its selector already checked is there. */
function targeted(e: DrawPointerEvent): TargetEvent {
    if (!hasFeatureTarget(e)) throw new TypeError("The event has no feature target")
    return e
}

/** A geometry type without the `Multi` prefix: what features must share to be combined. */
function baseType(feature: DrawFeature): string {
    return feature.type.replace(Constants.geojsonTypes.MULTI_PREFIX, "")
}

/** The geometry of a multi feature combining `features`, all of one base type. */
function combinedGeometry(features: DrawFeature[]): AnyDrawGeometry | undefined {
    const first = features.at(0)
    if (first === undefined) return undefined
    switch (baseType(first)) {
        case Constants.geojsonTypes.POINT: {
            const coordinates: Position[] = []
            for (const feature of features) {
                if (feature.type === Constants.geojsonTypes.POINT) coordinates.push(feature.getCoordinates())
                else if (feature.type === Constants.geojsonTypes.MULTI_POINT)
                    coordinates.push(...feature.getCoordinates())
                else return undefined
            }
            return { type: Constants.geojsonTypes.MULTI_POINT, coordinates }
        }
        case Constants.geojsonTypes.LINE_STRING: {
            const coordinates: Position[][] = []
            for (const feature of features) {
                if (feature.type === Constants.geojsonTypes.LINE_STRING) coordinates.push(feature.getCoordinates())
                else if (feature.type === Constants.geojsonTypes.MULTI_LINE_STRING) {
                    coordinates.push(...feature.getCoordinates())
                } else return undefined
            }
            return { type: Constants.geojsonTypes.MULTI_LINE_STRING, coordinates }
        }
        case Constants.geojsonTypes.POLYGON: {
            const coordinates: Position[][][] = []
            for (const feature of features) {
                if (feature.type === Constants.geojsonTypes.POLYGON) coordinates.push(feature.getCoordinates())
                else if (feature.type === Constants.geojsonTypes.MULTI_POLYGON)
                    coordinates.push(...feature.getCoordinates())
                else return undefined
            }
            return { type: Constants.geojsonTypes.MULTI_POLYGON, coordinates }
        }
    }
    return undefined
}

/** Selects, moves, combines and deletes whole features; the default mode. */
export default class SimpleSelect extends Mode {
    #dragMoveLocation: LngLatValue | null = null
    #boxSelectStartLocation: ScreenPoint | null = null
    #boxSelectElement: HTMLElement | null = null
    #boxSelecting = false
    #canBoxSelect = false
    #dragMoving = false
    #canDragMove = false
    readonly #initiallySelectedFeatureIds: FeatureId[]

    constructor(ctx: ModeContext, opts: ChangeModeOptions) {
        super(ctx)
        // turn the opts into state.
        this.#initiallySelectedFeatureIds = opts.featureIds || []

        this.setSelected(this.#initiallySelectedFeatureIds.filter(id => this.getFeature(id) !== undefined))
        this.#fireActionable()

        this.setActionableState({
            combineFeatures: true,
            uncombineFeatures: true,
            trash: true,
        })
    }

    #fireUpdate(): void {
        fireDrawEvent(this.map, Constants.events.UPDATE, {
            action: Constants.updateActions.MOVE,
            features: this.getSelected().map(f => f.toGeoJSON()),
        })
    }

    #fireActionable(): void {
        const selectedFeatures = this.getSelected()

        const multiFeatures = selectedFeatures.filter(feature => this.isInstanceOf("MultiFeature", feature))

        let combineFeatures = false

        const first = selectedFeatures.at(0)
        if (selectedFeatures.length > 1 && first !== undefined) {
            combineFeatures = true
            const featureType = baseType(first)
            for (const feature of selectedFeatures) {
                if (baseType(feature) !== featureType) {
                    combineFeatures = false
                }
            }
        }

        const uncombineFeatures = multiFeatures.length > 0
        const trash = selectedFeatures.length > 0

        this.setActionableState({
            combineFeatures,
            uncombineFeatures,
            trash,
        })
    }

    #getUniqueIds(allFeatures: DrawFeatureTarget[]): FeatureId[] {
        if (!allFeatures.length) return []
        const ids = new StringSet()
        for (const feature of allFeatures) {
            const id = feature.properties.id
            if (id !== undefined) ids.add(id)
        }

        return ids.values()
    }

    #stopExtendedInteractions(): void {
        if (this.#boxSelectElement) {
            if (this.#boxSelectElement.parentNode) {
                this.#boxSelectElement.parentNode.removeChild(this.#boxSelectElement)
            }
            this.#boxSelectElement = null
        }

        this.map.dragPan.enable()

        this.#boxSelecting = false
        this.#canBoxSelect = false
        this.#dragMoving = false
        this.#canDragMove = false
    }

    onStop(): void {
        doubleClickZoom.enable(this)
    }

    onMouseMove(e: DrawMouseEvent): HandlerResult {
        const isFeature = CommonSelectors.isFeature(e)
        if (isFeature && this.#dragMoving) this.#fireUpdate()

        // On mousemove that is not a drag, stop extended interactions.
        // This is useful if you drag off the canvas, release the button,
        // then move the mouse back over the canvas --- we don't allow the
        // interaction to continue then, but we do let it continue if you held
        // the mouse button that whole time
        this.#stopExtendedInteractions()

        // Skip render
        return true
    }

    onMouseOut(): HandlerResult {
        // As soon as you mouse leaves the canvas, update the feature
        if (this.#dragMoving) {
            this.#fireUpdate()
            return undefined
        }

        // Skip render
        return true
    }

    #clickOrTap(e: DrawPointerEvent): void {
        // Click (with or without shift) on no feature
        if (CommonSelectors.noTarget(e)) {
            this.#clickAnywhere() // also tap
            return
        }
        if (CommonSelectors.isOfMetaType(Constants.meta.VERTEX)(e)) {
            this.#clickOnVertex(targeted(e)) //tap
            return
        }
        if (CommonSelectors.isFeature(e)) this.#clickOnFeature(targeted(e))
    }

    onClick(e: DrawMouseEvent): void {
        this.#clickOrTap(e)
    }

    onTap(e: DrawTouchEvent): void {
        this.#clickOrTap(e)
    }

    #clickAnywhere(): void {
        // Clear the re-render selection
        const wasSelected = this.getSelectedIds()
        if (wasSelected.length) {
            this.clearSelectedFeatures()
            for (const id of wasSelected) {
                this.doRender(id)
            }
        }
        doubleClickZoom.enable(this)
        this.#stopExtendedInteractions()
    }

    #clickOnVertex(e: TargetEvent): void {
        // Enter direct select mode
        this.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: e.featureTarget.properties.parent,
            coordPath: e.featureTarget.properties.coord_path,
            startPos: e.lngLat,
        })
        this.updateUIClasses({ mouse: Constants.cursors.MOVE })
    }

    #startOnActiveFeature(e: TargetEvent): void {
        // Stop any already-underway extended interactions
        this.#stopExtendedInteractions()

        // Disable map.dragPan immediately so it can't start
        this.map.dragPan.disable()

        // Re-render it and enable drag move
        const id = e.featureTarget.properties.id
        if (id === undefined) throw new TypeError("The active feature has no id")
        this.doRender(id)

        // Set up the state for drag moving
        this.#canDragMove = true
        this.#dragMoveLocation = e.lngLat
    }

    #clickOnFeature(e: TargetEvent): void {
        // Stop everything
        doubleClickZoom.disable(this)
        this.#stopExtendedInteractions()

        const isShiftClick = CommonSelectors.isShiftDown(e)
        const selectedFeatureIds = this.getSelectedIds()
        const featureId = e.featureTarget.properties.id
        if (featureId === undefined) throw new TypeError("The clicked feature has no id")
        const isFeatureSelected = this.isSelected(featureId)

        // Click (without shift) on any selected feature but a point
        if (
            !isShiftClick &&
            isFeatureSelected &&
            requireFeature(this.getFeature(featureId)).type !== Constants.geojsonTypes.POINT
        ) {
            // Enter direct select mode
            this.changeMode(Constants.modes.DIRECT_SELECT, {
                featureId,
            })
            return
        }

        // Shift-click on a selected feature
        if (isFeatureSelected && isShiftClick) {
            // Deselect it
            this.deselect(featureId)
            this.updateUIClasses({ mouse: Constants.cursors.POINTER })
            if (selectedFeatureIds.length === 1) {
                doubleClickZoom.enable(this)
            }
            // Shift-click on an unselected feature
        } else if (!isFeatureSelected && isShiftClick) {
            // Add it to the selection
            this.select(featureId)
            this.updateUIClasses({ mouse: Constants.cursors.MOVE })
            // Click (without shift) on an unselected feature
        } else if (!isFeatureSelected && !isShiftClick) {
            // Make it the only selected feature
            for (const id of selectedFeatureIds) {
                this.doRender(id)
            }
            this.setSelected(featureId)
            this.updateUIClasses({ mouse: Constants.cursors.MOVE })
        }

        // No matter what, re-render the clicked feature
        this.doRender(featureId)
    }

    onMouseDown(e: DrawMouseEvent): void {
        if (CommonSelectors.isActiveFeature(e)) {
            this.#startOnActiveFeature(targeted(e))
            return
        }
        if (this.drawConfig.boxSelect && CommonSelectors.isShiftMousedown(e)) this.#startBoxSelect(e)
    }

    #startBoxSelect(e: DrawPointerEvent): void {
        this.#stopExtendedInteractions()
        this.map.dragPan.disable()
        // Enable box select
        this.#boxSelectStartLocation = mouseEventPoint(e.originalEvent, this.map.getContainer())
        this.#canBoxSelect = true
    }

    onTouchStart(e: DrawTouchEvent): void {
        if (CommonSelectors.isActiveFeature(e)) this.#startOnActiveFeature(targeted(e))
    }

    onDrag(e: DrawPointerEvent): void {
        if (this.#canDragMove) {
            this.#dragMove(e)
            return
        }
        if (this.drawConfig.boxSelect && this.#canBoxSelect) this.#whileBoxSelect(e)
    }

    #whileBoxSelect(e: DrawPointerEvent): void {
        this.#boxSelecting = true
        this.updateUIClasses({ mouse: Constants.cursors.ADD })

        // Create the box node if it doesn't exist
        let boxSelectElement = this.#boxSelectElement
        if (!boxSelectElement) {
            boxSelectElement = document.createElement("div")
            boxSelectElement.classList.add(Constants.classes.BOX_SELECT)
            this.map.getContainer().appendChild(boxSelectElement)
            this.#boxSelectElement = boxSelectElement
        }

        // Adjust the box node's width and xy position
        const start = this.#boxSelectStartLocation
        if (start === null) throw new TypeError("Box select has no start location")
        const current = mouseEventPoint(e.originalEvent, this.map.getContainer())
        const minX = Math.min(start.x, current.x)
        const maxX = Math.max(start.x, current.x)
        const minY = Math.min(start.y, current.y)
        const maxY = Math.max(start.y, current.y)
        const translateValue = `translate(${minX}px, ${minY}px)`
        boxSelectElement.style.transform = translateValue
        boxSelectElement.style.setProperty("-webkit-transform", translateValue)
        boxSelectElement.style.width = `${maxX - minX}px`
        boxSelectElement.style.height = `${maxY - minY}px`
    }

    #dragMove(e: DrawPointerEvent): void {
        // Dragging when drag move is enabled
        this.#dragMoving = true
        e.originalEvent.stopPropagation()

        const location = this.#dragMoveLocation
        if (location === null) throw new TypeError("Drag move has no start location")
        const delta = {
            lng: e.lngLat.lng - location.lng,
            lat: e.lngLat.lat - location.lat,
        }

        moveFeatures(this.getSelected(), delta)

        this.#dragMoveLocation = e.lngLat
    }

    #endInteraction(e: DrawPointerEvent): void {
        // End any extended interactions
        if (this.#dragMoving) {
            this.#fireUpdate()
        } else if (this.#boxSelecting) {
            const start = this.#boxSelectStartLocation
            if (start === null) throw new TypeError("Box select has no start location")
            const end = mouseEventPoint(e.originalEvent, this.map.getContainer())
            const featuresInBox = this.featuresAt(
                null,
                [
                    [start.x, start.y],
                    [end.x, end.y],
                ],
                "click",
            )
            const idsToSelect = this.#getUniqueIds(featuresInBox).filter(id => !this.isSelected(id))

            if (idsToSelect.length) {
                this.select(idsToSelect)
                for (const id of idsToSelect) {
                    this.doRender(id)
                }
                this.updateUIClasses({ mouse: Constants.cursors.MOVE })
            }
        }
        this.#stopExtendedInteractions()
    }

    onMouseUp(e: DrawMouseEvent): void {
        this.#endInteraction(e)
    }

    onTouchEnd(e: DrawTouchEvent): void {
        this.#endInteraction(e)
    }

    toDisplayFeatures(geojson: DrawRenderFeature, display: RenderPush): void {
        const id = geojson.properties.id
        geojson.properties.active =
            id !== undefined && this.isSelected(id) ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        display(geojson)
        this.#fireActionable()
        if (
            geojson.properties.active !== Constants.activeStates.ACTIVE ||
            geojson.geometry.type === Constants.geojsonTypes.POINT
        )
            return
        for (const point of createSupplementaryPoints(geojson)) {
            display(point)
        }
    }

    onTrash(): void {
        this.deleteFeature(this.getSelectedIds())
        this.#fireActionable()
    }

    onCombineFeatures(): void {
        const selectedFeatures = this.getSelected()

        if (selectedFeatures.length === 0 || selectedFeatures.length < 2) return

        const geometry = combinedGeometry(selectedFeatures)
        // Features of different types do not combine
        if (geometry === undefined) return
        const featuresCombined = selectedFeatures.map(feature => feature.toGeoJSON())

        const first = featuresCombined.at(0)
        if (featuresCombined.length > 1 && first !== undefined) {
            const multiFeature = this.newFeature({
                type: Constants.geojsonTypes.FEATURE,
                properties: first.properties,
                geometry,
            })

            this.addFeature(multiFeature)
            this.deleteFeature(this.getSelectedIds(), { silent: true })
            this.setSelected([multiFeature.id])

            fireDrawEvent(this.map, Constants.events.COMBINE_FEATURES, {
                createdFeatures: [multiFeature.toGeoJSON()],
                deletedFeatures: featuresCombined,
            })
        }
        this.#fireActionable()
    }

    onUncombineFeatures(): void {
        const selectedFeatures = this.getSelected()
        if (selectedFeatures.length === 0) return

        const createdFeatures: DrawExportedFeature[] = []
        const featuresUncombined: DrawExportedFeature[] = []

        for (const feature of selectedFeatures) {
            if (this.isInstanceOf("MultiFeature", feature)) {
                for (const subFeature of feature.getFeatures()) {
                    this.addFeature(subFeature)
                    subFeature.properties = feature.properties
                    createdFeatures.push(subFeature.toGeoJSON())
                    this.select([subFeature.id])
                }
                this.deleteFeature(feature.id, { silent: true })
                featuresUncombined.push(feature.toGeoJSON())
            }
        }

        if (createdFeatures.length > 1) {
            fireDrawEvent(this.map, Constants.events.UNCOMBINE_FEATURES, {
                createdFeatures,
                deletedFeatures: featuresUncombined,
            })
        }
        this.#fireActionable()
    }
}

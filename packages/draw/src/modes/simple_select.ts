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
import type {
    AnyDrawGeometry,
    DrawFeatureTarget,
    DrawExportedFeature,
    DrawPointerEvent,
    FeatureId,
    LngLatValue,
    ScreenPoint,
} from "../types"
import type { DrawMode } from "./mode_interface"

export interface SimpleSelectOptions {
    featureIds?: FeatureId[]
}

export interface SimpleSelectState {
    dragMoveLocation: LngLatValue | null
    boxSelectStartLocation: ScreenPoint | null
    boxSelectElement: HTMLElement | null | undefined
    boxSelecting: boolean
    canBoxSelect: boolean
    dragMoving: boolean
    canDragMove: boolean
    initiallySelectedFeatureIds: FeatureId[]
}

/** An event over a rendered Draw feature. */
type TargetEvent = DrawPointerEvent & { featureTarget: DrawFeatureTarget }

interface SimpleSelectHelpers {
    fireUpdate(): void
    fireActionable(): void
    getUniqueIds(allFeatures: DrawFeatureTarget[]): FeatureId[]
    stopExtendedInteractions(state: SimpleSelectState): void
    clickOrTap(state: SimpleSelectState, e: DrawPointerEvent): void
    clickAnywhere(state: SimpleSelectState): void
    clickOnVertex(state: SimpleSelectState, e: TargetEvent): void
    startOnActiveFeature(state: SimpleSelectState, e: TargetEvent): void
    clickOnFeature(state: SimpleSelectState, e: TargetEvent): void
    startBoxSelect(state: SimpleSelectState, e: DrawPointerEvent): void
    whileBoxSelect(state: SimpleSelectState, e: DrawPointerEvent): void
    dragMove(state: SimpleSelectState, e: DrawPointerEvent): void
    endInteraction(state: SimpleSelectState, e: DrawPointerEvent): void
}

function hasFeatureTarget(e: DrawPointerEvent): e is TargetEvent {
    return e.featureTarget !== undefined
}

/** The event, narrowed to one with a feature target, which its selector already checked is there. */
function targeted(e: DrawPointerEvent): TargetEvent {
    if (!hasFeatureTarget(e)) throw new TypeError("The event has no feature target")
    return e
}

/** A geometry type without the `Multi` prefix: what features must share to be combined. */
function baseType(feature: DrawFeature | undefined): string {
    return requireFeature(feature).type.replace(Constants.geojsonTypes.MULTI_PREFIX, "")
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

const SimpleSelect: DrawMode<SimpleSelectState, SimpleSelectOptions, SimpleSelectHelpers> = {
    onSetup(opts) {
        // turn the opts into state.
        const state: SimpleSelectState = {
            dragMoveLocation: null,
            boxSelectStartLocation: null,
            boxSelectElement: undefined,
            boxSelecting: false,
            canBoxSelect: false,
            dragMoving: false,
            canDragMove: false,
            initiallySelectedFeatureIds: opts.featureIds || [],
        }

        this.setSelected(state.initiallySelectedFeatureIds.filter(id => this.getFeature(id) !== undefined))
        this.fireActionable()

        this.setActionableState({
            combineFeatures: true,
            uncombineFeatures: true,
            trash: true,
        })

        return state
    },

    fireUpdate() {
        fireDrawEvent(this.map, Constants.events.UPDATE, {
            action: Constants.updateActions.MOVE,
            features: this.getSelected().map(f => requireFeature(f).toGeoJSON()),
        })
    },

    fireActionable() {
        const selectedFeatures = this.getSelected()

        const multiFeatures = selectedFeatures.filter(feature => this.isInstanceOf("MultiFeature", feature))

        let combineFeatures = false

        if (selectedFeatures.length > 1) {
            combineFeatures = true
            const featureType = baseType(selectedFeatures.at(0))
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
    },

    getUniqueIds(allFeatures) {
        if (!allFeatures.length) return []
        const ids = new StringSet()
        for (const feature of allFeatures) {
            const id = feature.properties.id
            if (id !== undefined) ids.add(id)
        }

        return ids.values()
    },

    stopExtendedInteractions(state) {
        if (state.boxSelectElement) {
            if (state.boxSelectElement.parentNode) {
                state.boxSelectElement.parentNode.removeChild(state.boxSelectElement)
            }
            state.boxSelectElement = null
        }

        this.map.dragPan.enable()

        state.boxSelecting = false
        state.canBoxSelect = false
        state.dragMoving = false
        state.canDragMove = false
    },

    onStop() {
        doubleClickZoom.enable(this)
    },

    onMouseMove(state, e) {
        const isFeature = CommonSelectors.isFeature(e)
        if (isFeature && state.dragMoving) this.fireUpdate()

        // On mousemove that is not a drag, stop extended interactions.
        // This is useful if you drag off the canvas, release the button,
        // then move the mouse back over the canvas --- we don't allow the
        // interaction to continue then, but we do let it continue if you held
        // the mouse button that whole time
        this.stopExtendedInteractions(state)

        // Skip render
        return true
    },

    onMouseOut(state) {
        // As soon as you mouse leaves the canvas, update the feature
        if (state.dragMoving) return this.fireUpdate()

        // Skip render
        return true
    },

    clickOrTap(state, e) {
        // Click (with or without shift) on no feature
        if (CommonSelectors.noTarget(e)) return this.clickAnywhere(state) // also tap
        if (CommonSelectors.isOfMetaType(Constants.meta.VERTEX)(e)) return this.clickOnVertex(state, targeted(e)) //tap
        if (CommonSelectors.isFeature(e)) return this.clickOnFeature(state, targeted(e))
    },

    onClick(state, e) {
        return this.clickOrTap(state, e)
    },

    onTap(state, e) {
        return this.clickOrTap(state, e)
    },

    clickAnywhere(state) {
        // Clear the re-render selection
        const wasSelected = this.getSelectedIds()
        if (wasSelected.length) {
            this.clearSelectedFeatures()
            for (const id of wasSelected) {
                this.doRender(id)
            }
        }
        doubleClickZoom.enable(this)
        this.stopExtendedInteractions(state)
    },

    clickOnVertex(_, e) {
        // Enter direct select mode
        this.changeMode(Constants.modes.DIRECT_SELECT, {
            featureId: e.featureTarget.properties.parent,
            coordPath: e.featureTarget.properties.coord_path,
            startPos: e.lngLat,
        })
        this.updateUIClasses({ mouse: Constants.cursors.MOVE })
    },

    startOnActiveFeature(state, e) {
        // Stop any already-underway extended interactions
        this.stopExtendedInteractions(state)

        // Disable map.dragPan immediately so it can't start
        this.map.dragPan.disable()

        // Re-render it and enable drag move
        const id = e.featureTarget.properties.id
        if (id === undefined) throw new TypeError("The active feature has no id")
        this.doRender(id)

        // Set up the state for drag moving
        state.canDragMove = true
        state.dragMoveLocation = e.lngLat
    },

    clickOnFeature(state, e) {
        // Stop everything
        doubleClickZoom.disable(this)
        this.stopExtendedInteractions(state)

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
            return this.changeMode(Constants.modes.DIRECT_SELECT, {
                featureId,
            })
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
    },

    onMouseDown(state, e) {
        if (CommonSelectors.isActiveFeature(e)) return this.startOnActiveFeature(state, targeted(e))
        if (this.drawConfig.boxSelect && CommonSelectors.isShiftMousedown(e)) return this.startBoxSelect(state, e)
    },

    startBoxSelect(state, e) {
        this.stopExtendedInteractions(state)
        this.map.dragPan.disable()
        // Enable box select
        state.boxSelectStartLocation = mouseEventPoint(e.originalEvent, this.map.getContainer())
        state.canBoxSelect = true
    },

    onTouchStart(state, e) {
        if (CommonSelectors.isActiveFeature(e)) return this.startOnActiveFeature(state, targeted(e))
    },

    onDrag(state, e) {
        if (state.canDragMove) return this.dragMove(state, e)
        if (this.drawConfig.boxSelect && state.canBoxSelect) return this.whileBoxSelect(state, e)
    },

    whileBoxSelect(state, e) {
        state.boxSelecting = true
        this.updateUIClasses({ mouse: Constants.cursors.ADD })

        // Create the box node if it doesn't exist
        let boxSelectElement = state.boxSelectElement
        if (!boxSelectElement) {
            boxSelectElement = document.createElement("div")
            boxSelectElement.classList.add(Constants.classes.BOX_SELECT)
            this.map.getContainer().appendChild(boxSelectElement)
            state.boxSelectElement = boxSelectElement
        }

        // Adjust the box node's width and xy position
        const start = state.boxSelectStartLocation
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
    },

    dragMove(state, e) {
        // Dragging when drag move is enabled
        state.dragMoving = true
        e.originalEvent.stopPropagation()

        const location = state.dragMoveLocation
        if (location === null) throw new TypeError("Drag move has no start location")
        const delta = {
            lng: e.lngLat.lng - location.lng,
            lat: e.lngLat.lat - location.lat,
        }

        moveFeatures(this.getSelected().map(requireFeature), delta)

        state.dragMoveLocation = e.lngLat
    },

    endInteraction(state, e) {
        // End any extended interactions
        if (state.dragMoving) {
            this.fireUpdate()
        } else if (state.boxSelecting) {
            const start = state.boxSelectStartLocation
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
            const idsToSelect = this.getUniqueIds(featuresInBox).filter(id => !this.isSelected(id))

            if (idsToSelect.length) {
                this.select(idsToSelect)
                for (const id of idsToSelect) {
                    this.doRender(id)
                }
                this.updateUIClasses({ mouse: Constants.cursors.MOVE })
            }
        }
        this.stopExtendedInteractions(state)
    },

    onMouseUp(state, e) {
        return this.endInteraction(state, e)
    },

    onTouchEnd(state, e) {
        return this.endInteraction(state, e)
    },

    toDisplayFeatures(_, geojson, display) {
        const id = geojson.properties.id
        geojson.properties.active =
            id !== undefined && this.isSelected(id) ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        display(geojson)
        this.fireActionable()
        if (
            geojson.properties.active !== Constants.activeStates.ACTIVE ||
            geojson.geometry.type === Constants.geojsonTypes.POINT
        )
            return
        for (const point of createSupplementaryPoints(geojson)) {
            display(point)
        }
    },

    onTrash() {
        this.deleteFeature(this.getSelectedIds())
        this.fireActionable()
    },

    onCombineFeatures() {
        const selectedFeatures = this.getSelected()

        if (selectedFeatures.length === 0 || selectedFeatures.length < 2) return

        const features = selectedFeatures.map(requireFeature)
        const geometry = combinedGeometry(features)
        // Features of different types do not combine
        if (geometry === undefined) return
        const featuresCombined = features.map(feature => feature.toGeoJSON())

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
        this.fireActionable()
    },

    onUncombineFeatures() {
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
        this.fireActionable()
    },
}

export default SimpleSelect

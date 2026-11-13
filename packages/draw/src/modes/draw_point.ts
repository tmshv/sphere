import * as CommonSelectors from "../lib/common_selectors"
import * as Constants from "../constants"
import type Point from "../feature_types/point"
import type { RenderPush } from "../lib/mode_handler"
import { fireDrawEvent } from "../map-events"
import type { DrawKeyboardEvent, DrawMouseEvent, DrawPointerEvent, DrawRenderFeature, DrawTouchEvent } from "../types"
import Mode, { type ModeContext } from "./mode"

/** Places one point, then switches to simple_select with the point selected. */
export default class DrawPoint extends Mode {
    readonly #point: Point

    constructor(ctx: ModeContext) {
        super(ctx)
        this.#point = this.newFeature({
            type: Constants.geojsonTypes.FEATURE,
            properties: {},
            geometry: {
                type: Constants.geojsonTypes.POINT,
                coordinates: [],
            },
        })

        this.addFeature(this.#point)

        this.clearSelectedFeatures()
        this.updateUIClasses({ mouse: Constants.cursors.ADD })
        this.activateUIButton(Constants.types.POINT)

        this.setActionableState({
            trash: true,
        })
    }

    #stopDrawingAndRemove(): void {
        this.deleteFeature([this.#point.id], { silent: true })
        this.changeMode(Constants.modes.SIMPLE_SELECT)
    }

    #placePoint(e: DrawPointerEvent): void {
        this.updateUIClasses({ mouse: Constants.cursors.MOVE })
        this.#point.updateCoordinate("", e.lngLat.lng, e.lngLat.lat)
        fireDrawEvent(this.map, Constants.events.CREATE, {
            features: [this.#point.toGeoJSON()],
        })
        this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [this.#point.id] })
    }

    onClick(e: DrawMouseEvent): void {
        this.#placePoint(e)
    }

    onTap(e: DrawTouchEvent): void {
        this.#placePoint(e)
    }

    onStop(): void {
        this.activateUIButton()
        if (!this.#point.getCoordinate().length) {
            this.deleteFeature([this.#point.id], { silent: true })
        }
    }

    toDisplayFeatures(geojson: DrawRenderFeature, display: RenderPush): void {
        // Never render the point we're drawing
        const isActivePoint = geojson.properties.id === this.#point.id
        geojson.properties.active = isActivePoint ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE
        if (!isActivePoint) display(geojson)
    }

    onTrash(): void {
        this.#stopDrawingAndRemove()
    }

    onKeyUp(e: DrawKeyboardEvent): void {
        if (CommonSelectors.isEscapeKey(e) || CommonSelectors.isEnterKey(e)) {
            this.#stopDrawingAndRemove()
        }
    }
}

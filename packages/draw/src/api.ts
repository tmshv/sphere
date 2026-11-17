import type { FeatureCollection, Geometry, GeometryCollection } from "geojson"
import coordinatesEqual from "./lib/coordinates-equal"
import generateId from "./lib/generate-id"
import jsonClone from "./lib/json-clone"
import normalize, { type DrawInput } from "./lib/normalize"
import featuresAt from "./lib/features-at"
import stringSetsAreEqual from "./lib/string-sets-are-equal"
import * as Constants from "./constants"
import StringSet from "./lib/string-set"
import createFeature, { isGeometryKind } from "./feature-types/create-feature"
import type { DrawFeature } from "./feature-types/draw-feature"
import type { DrawContext } from "./context"
import type {
    ChangeModeOptions,
    AnyDrawGeometry,
    DrawFeatureCollection,
    DrawExportedFeature,
    FeatureId,
    FeatureProperties,
    ScreenPoint,
} from "./types"

function isDrawGeometry(geometry: Geometry): geometry is Exclude<Geometry, GeometryCollection> {
    return geometry.type !== "GeometryCollection" && isGeometryKind(geometry.type)
}

/** Replaces a feature's coordinates with those of GeoJSON of the same geometry type. */
function incomingCoords(feature: DrawFeature, geometry: AnyDrawGeometry): void {
    if (feature.type === Constants.geojsonTypes.POINT && geometry.type === Constants.geojsonTypes.POINT) {
        feature.incomingCoords(geometry.coordinates)
        return
    }
    if (feature.type === Constants.geojsonTypes.LINE_STRING && geometry.type === Constants.geojsonTypes.LINE_STRING) {
        feature.incomingCoords(geometry.coordinates)
        return
    }
    if (feature.type === Constants.geojsonTypes.POLYGON && geometry.type === Constants.geojsonTypes.POLYGON) {
        feature.incomingCoords(geometry.coordinates)
        return
    }
    if (feature.type === Constants.geojsonTypes.MULTI_POINT && geometry.type === Constants.geojsonTypes.MULTI_POINT) {
        feature.incomingCoords(geometry.coordinates)
        return
    }
    if (
        feature.type === Constants.geojsonTypes.MULTI_LINE_STRING &&
        geometry.type === Constants.geojsonTypes.MULTI_LINE_STRING
    ) {
        feature.incomingCoords(geometry.coordinates)
        return
    }
    if (
        feature.type === Constants.geojsonTypes.MULTI_POLYGON &&
        geometry.type === Constants.geojsonTypes.MULTI_POLYGON
    ) {
        feature.incomingCoords(geometry.coordinates)
        return
    }
    throw new TypeError(`Cannot replace ${feature.type} coordinates with ${geometry.type} ones`)
}

/** Draw's public API. `MapLibreDraw` adds the map control on top. */
export default class DrawApi {
    #ctx: DrawContext

    modes = Constants.modes

    constructor(ctx: DrawContext) {
        this.#ctx = ctx
    }

    getFeatureIdsAt = (point: ScreenPoint): (FeatureId | undefined)[] => {
        const features = featuresAt.click({ point }, null, this.#ctx)
        return features.map(feature => feature.properties.id)
    }

    getSelectedIds = (): FeatureId[] => this.#ctx.store.getSelectedIds()

    getSelected = (): DrawFeatureCollection => ({
        type: Constants.geojsonTypes.FEATURE_COLLECTION,
        features: this.#ctx.store.getSelected().map(feature => feature.toGeoJSON()),
    })

    getSelectedPoints = (): DrawFeatureCollection => ({
        type: Constants.geojsonTypes.FEATURE_COLLECTION,
        features: this.#ctx.store.getSelectedCoordinates().map(coordinate => ({
            type: Constants.geojsonTypes.FEATURE,
            properties: {},
            geometry: {
                type: Constants.geojsonTypes.POINT,
                coordinates: coordinate.coordinates,
            },
        })),
    })

    set = (featureCollection: FeatureCollection<Geometry | null, FeatureProperties | null>): FeatureId[] => {
        // Plain JavaScript callers can pass anything
        if (
            featureCollection.type === undefined ||
            featureCollection.type !== Constants.geojsonTypes.FEATURE_COLLECTION ||
            !Array.isArray(featureCollection.features)
        ) {
            throw new Error("Invalid FeatureCollection")
        }
        const renderBatch = this.#ctx.store.createRenderBatch()
        let toDelete = this.#ctx.store.getAllIds().slice()
        const newIds = this.add(featureCollection)
        const newIdsLookup = new StringSet(newIds)

        toDelete = toDelete.filter(id => !newIdsLookup.has(id))
        if (toDelete.length) {
            this.delete(toDelete)
        }

        renderBatch()
        return newIds
    }

    add = (geojson: DrawInput): FeatureId[] => this.#addFeatures(geojson, feature => feature.id || generateId())

    /**
     * Silently puts a working set of features into Draw: no `draw.create`, `draw.update` or `draw.delete` is
     * emitted, so the app must not treat loaded features as edits.
     *
     * Ids are kept exactly as given: a numeric id stays a number (`0` included), a string id stays a string,
     * and `getAll()` returns the same value, so the app can map it back. Number and string ids are distinct
     * (`7` is not `"7"`). A feature with no id, or an empty-string id, gets a generated string one (as in `add`). A feature whose id is already in
     * Draw is replaced.
     */
    load = (featureCollection: FeatureCollection<Geometry | null, FeatureProperties | null>): void => {
        const replaced = new Set<FeatureId>()
        this.#addFeatures(featureCollection, feature => {
            const id = feature.id === undefined || feature.id === "" ? generateId() : feature.id
            if (this.#ctx.store.get(id) !== undefined) replaced.add(id)
            return id
        })
        // direct_select keeps the feature and its vertex paths: after a replace they may be stale or the
        // geometry may not be editable any more, so start the mode over or leave it.
        const target = this.#ctx.store.getSelectedIds().at(0)
        if (this.getMode() === Constants.modes.DIRECT_SELECT && target !== undefined && replaced.has(target)) {
            this.#ctx.store.clearSelectedCoordinates()
            const feature = this.#ctx.store.get(target)
            const editable = feature !== undefined && feature.type !== Constants.geojsonTypes.POINT
            this.#ctx.events.changeMode(
                editable ? Constants.modes.DIRECT_SELECT : Constants.modes.SIMPLE_SELECT,
                editable ? { featureId: target } : { featureIds: [target] },
                { silent: true },
            )
        }
        this.#ctx.store.render()
    }

    /**
     * Silently removes features from Draw, without `draw.delete`. They also leave the selection and the
     * selected vertices. Unknown ids are ignored. Like `delete`, it leaves `direct_select` when the edited
     * feature is gone.
     */
    unload = (featureIds: FeatureId[]): void => {
        this.delete(featureIds)
    }

    /**
     * Silently sets the selection to `featureIds`: no `draw.selectionchange` is emitted. Ids that are not in
     * Draw are ignored. In `direct_select`, a result that is not exactly the edited feature leaves it for
     * `simple_select`.
     */
    setSelected = (featureIds: FeatureId[]): void => {
        const edited = this.#ctx.store.getSelectedIds().at(0)
        const known = featureIds.filter(id => this.#ctx.store.get(id) !== undefined)
        this.#ctx.store.setSelected(known, { silent: true })
        const selected = this.#ctx.store.getSelectedIds()
        const stillEditing = selected.length === 1 && selected.at(0) === edited
        if (this.getMode() === Constants.modes.DIRECT_SELECT && !stillEditing) {
            this.#ctx.events.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: selected }, { silent: true })
            // Leaving direct_select drops its selected vertices, which would report a selection change
            this.#ctx.store.discardPendingSelectionChange()
            return
        }
        this.#ctx.store.render()
    }

    #addFeatures = (geojson: DrawInput, idOf: (feature: { id?: FeatureId }) => FeatureId): FeatureId[] => {
        const featureCollection = jsonClone(normalize(geojson))
        if (featureCollection === null) throw new TypeError("Invalid GeoJSON")

        const ids = featureCollection.features.map(feature => {
            const id = idOf(feature)
            feature.id = id

            const geometry = feature.geometry
            if (geometry === null) {
                throw new Error("Invalid geometry: null")
            }

            const existing = this.#ctx.store.get(id)
            if (existing === undefined || existing.type !== geometry.type) {
                // If the feature has not yet been created ...
                if (!isDrawGeometry(geometry)) {
                    throw new Error(`Invalid geometry type: ${geometry.type}.`)
                }
                const internalFeature = createFeature(this.#ctx, { ...feature, id, geometry })
                this.#ctx.store.add(internalFeature)
            } else if (isDrawGeometry(geometry)) {
                // If a feature of that id has already been created, and we are swapping it out ...
                existing.properties = feature.properties
                if (!coordinatesEqual(existing.getCoordinates(), geometry.coordinates)) {
                    incomingCoords(existing, geometry)
                }
            }
            return id
        })

        this.#ctx.store.render()
        return ids
    }

    get = (id: FeatureId): DrawExportedFeature | undefined => {
        const feature = this.#ctx.store.get(id)
        if (feature) {
            return feature.toGeoJSON()
        }
    }

    getAll = (): DrawFeatureCollection => ({
        type: Constants.geojsonTypes.FEATURE_COLLECTION,
        features: this.#ctx.store.getAll().map(feature => feature.toGeoJSON()),
    })

    delete = (featureIds: FeatureId | FeatureId[]): this => {
        this.#ctx.store.delete(featureIds, { silent: true })
        // If we were in direct select mode and our selected feature no longer exists
        // (because it was deleted), we need to get out of that mode.
        if (this.getMode() === Constants.modes.DIRECT_SELECT && !this.#ctx.store.getSelectedIds().length) {
            this.#ctx.events.changeMode(Constants.modes.SIMPLE_SELECT, undefined, { silent: true })
        } else {
            this.#ctx.store.render()
        }

        return this
    }

    deleteAll = (): this => {
        this.#ctx.store.delete(this.#ctx.store.getAllIds(), { silent: true })
        // If we were in direct select mode, now our selected feature no longer exists,
        // so escape that mode.
        if (this.getMode() === Constants.modes.DIRECT_SELECT) {
            this.#ctx.events.changeMode(Constants.modes.SIMPLE_SELECT, undefined, { silent: true })
        } else {
            this.#ctx.store.render()
        }

        return this
    }

    changeMode = (mode: string, modeOptions: ChangeModeOptions = {}): this => {
        // Avoid changing modes just to re-select what's already selected
        if (mode === Constants.modes.SIMPLE_SELECT && this.getMode() === Constants.modes.SIMPLE_SELECT) {
            if (stringSetsAreEqual(modeOptions.featureIds || [], this.#ctx.store.getSelectedIds())) return this
            // And if we are changing the selection within simple_select mode, just change the selection,
            // instead of stopping and re-starting the mode
            this.#ctx.store.setSelected(modeOptions.featureIds, { silent: true })
            this.#ctx.store.render()
            return this
        }

        if (
            mode === Constants.modes.DIRECT_SELECT &&
            this.getMode() === Constants.modes.DIRECT_SELECT &&
            modeOptions.featureId === this.#ctx.store.getSelectedIds().at(0)
        ) {
            return this
        }

        this.#ctx.events.changeMode(mode, modeOptions, { silent: true })
        return this
    }

    getMode = (): string | null => this.#ctx.events.getMode()

    trash = (): this => {
        this.#ctx.events.trash()
        return this
    }

    combineFeatures = (): this => {
        this.#ctx.events.combineFeatures()
        return this
    }

    uncombineFeatures = (): this => {
        this.#ctx.events.uncombineFeatures()
        return this
    }

    setFeatureProperty = (featureId: FeatureId, property: string, value: unknown): this => {
        this.#ctx.store.setFeatureProperty(featureId, property, value)
        return this
    }
}

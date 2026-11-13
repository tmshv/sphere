import type { Position } from "geojson"
import generateId from "../lib/generate_id"
import jsonClone from "../lib/json_clone"
import * as Constants from "../constants"
import type {
    CoordinatesMap,
    DrawFeatureInput,
    DrawGeoJSONFeature,
    DrawGeometry,
    DrawRenderFeature,
    DrawRenderProperties,
    FeatureId,
    FeatureProperties,
    GeometryKind,
} from "../types"

/** What a feature needs from the Draw context. */
export interface FeatureContext {
    readonly options: { readonly userProperties: boolean }
    readonly store: { featureChanged(featureId: FeatureId): unknown }
}

/**
 * Base of Draw's editable features. A feature keeps its GeoJSON coordinates in
 * `coordinates` (a multi feature keeps them in its parts instead) and reports
 * every change to the store, so it gets re-rendered.
 */
abstract class Feature<K extends GeometryKind = GeometryKind> {
    ctx: FeatureContext
    /** `null` only when `Draw.add` replaced a feature with GeoJSON whose properties are `null` */
    properties: FeatureProperties | null
    coordinates?: CoordinatesMap[K]
    id: FeatureId
    type: K

    constructor(ctx: FeatureContext, geojson: DrawFeatureInput<K>) {
        this.ctx = ctx
        this.properties = geojson.properties || {}
        this.coordinates = geojson.geometry.coordinates
        this.id = geojson.id || generateId()
        this.type = geojson.geometry.type
    }

    /** Whether the feature has enough coordinates to be a valid GeoJSON geometry. */
    abstract isValid(): boolean

    /** The position at a dot-separated coordinate path. */
    abstract getCoordinate(path: string): Position

    /** Moves the position at a dot-separated coordinate path. */
    abstract updateCoordinate(path: string, lng: number, lat: number): void

    changed(): void {
        this.ctx.store.featureChanged(this.id)
    }

    incomingCoords(coords: CoordinatesMap[K]): void {
        this.setCoordinates(coords)
    }

    setCoordinates(coords: CoordinatesMap[K]): void {
        this.coordinates = coords
        this.changed()
    }

    getCoordinates(): CoordinatesMap[K] {
        if (this.coordinates === undefined) {
            throw new TypeError(`${this.type} feature ${this.id} has no coordinates`)
        }
        return jsonClone(this.coordinates)
    }

    setProperty(property: string, value: unknown): void {
        if (this.properties === null) throw new TypeError(`Feature ${this.id} has null properties`)
        this.properties[property] = value
    }

    toGeoJSON(): DrawGeoJSONFeature<K> {
        return jsonClone({
            id: this.id,
            type: Constants.geojsonTypes.FEATURE,
            properties: this.properties,
            geometry: {
                coordinates: this.getCoordinates(),
                type: this.type,
            },
        })
    }

    internal(mode: string | null): DrawRenderFeature<DrawGeometry<K>> {
        const properties: DrawRenderProperties = {
            id: this.id,
            meta: Constants.meta.FEATURE,
            "meta:type": this.type,
            active: Constants.activeStates.INACTIVE,
            mode,
        }

        if (this.ctx.options.userProperties && this.properties !== null) {
            for (const name in this.properties) {
                properties[`user_${name}`] = this.properties[name]
            }
        }

        return {
            type: Constants.geojsonTypes.FEATURE,
            properties,
            geometry: {
                coordinates: this.getCoordinates(),
                type: this.type,
            },
        }
    }
}

export default Feature

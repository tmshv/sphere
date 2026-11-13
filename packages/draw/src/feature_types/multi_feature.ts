import type { Position } from "geojson"
import Feature, { type FeatureContext } from "./feature"
import * as Constants from "../constants"
import elementAt from "../lib/element_at"
import generateId from "../lib/generate_id"
import jsonClone from "../lib/json_clone"
import type { CoordinatesMap, DrawFeatureInput, MultiGeometryKind, SingleGeometryKind } from "../types"

import Point from "./point"
import LineString from "./line_string"
import Polygon from "./polygon"

interface PartKinds {
    MultiPoint: "Point"
    MultiLineString: "LineString"
    MultiPolygon: "Polygon"
}

interface PartClasses {
    Point: Point
    LineString: LineString
    Polygon: Polygon
}

/** A single feature a multi feature of kind `K` is made of. */
export type MultiFeaturePart<K extends MultiGeometryKind> = PartClasses[PartKinds[K]]

/** Turns a multi feature's coordinates into its parts and back. */
export interface MultiModel<K extends MultiGeometryKind> {
    toFeatures(ctx: FeatureContext, coordinates: CoordinatesMap[K]): MultiFeaturePart<K>[]
    toCoordinates(features: MultiFeaturePart<K>[]): CoordinatesMap[K]
}

type MultiModels = { [P in MultiGeometryKind]: MultiModel<P> }

function part<K extends SingleGeometryKind>(type: K, coordinates: CoordinatesMap[K]): DrawFeatureInput<K> {
    return {
        id: generateId(),
        type: Constants.geojsonTypes.FEATURE,
        properties: {},
        geometry: {
            coordinates,
            type,
        },
    }
}

const models: MultiModels = {
    MultiPoint: {
        toFeatures: (ctx, coordinates) =>
            coordinates.map(coords => new Point(ctx, part(Constants.geojsonTypes.POINT, coords))),
        toCoordinates: features => features.map(f => f.coordinates),
    },
    MultiLineString: {
        toFeatures: (ctx, coordinates) =>
            coordinates.map(coords => new LineString(ctx, part(Constants.geojsonTypes.LINE_STRING, coords))),
        toCoordinates: features => features.map(f => f.coordinates),
    },
    MultiPolygon: {
        toFeatures: (ctx, coordinates) =>
            coordinates.map(coords => new Polygon(ctx, part(Constants.geojsonTypes.POLYGON, coords))),
        toCoordinates: features => features.map(f => f.getCoordinates()),
    },
}

/**
 * Splits a multi feature coordinate path into the part index and the path
 * within the part (`null` when there is none, as for a point).
 */
function splitPath(path: string): { index: number; tail: string | null } {
    const parts = path.split(".")
    const index = parseInt(parts.at(0) ?? "", 10)
    const tail = !parts.at(1) ? null : parts.slice(1).join(".")
    return { index, tail }
}

function requireTail(tail: string | null, path: string): string {
    if (tail === null) throw new TypeError(`Coordinate path ${path} does not reach a position`)
    return tail
}

/**
 * A MultiPoint, MultiLineString or MultiPolygon, edited through its single
 * features (`features`). It has no `coordinates` of its own.
 */
class MultiFeature<K extends MultiGeometryKind = MultiGeometryKind> extends Feature<K> {
    model: MultiModel<K>
    features: MultiFeaturePart<K>[]

    constructor(ctx: FeatureContext, geojson: DrawFeatureInput<K>) {
        super(ctx, geojson)

        delete this.coordinates
        const model = models[geojson.geometry.type]
        // Plain JavaScript callers can pass any geometry type
        if (model === undefined) throw new TypeError(`${geojson.geometry.type} is not a valid type`)
        this.model = model
        this.features = model.toFeatures(ctx, geojson.geometry.coordinates)
    }

    #part(index: number): Point | LineString | Polygon {
        const feature = elementAt(this.features, index)
        if (feature === undefined) throw new TypeError(`${this.type} has no part ${index}`)
        return feature
    }

    isValid(): boolean {
        return this.features.every(f => f.isValid())
    }

    setCoordinates(coords: CoordinatesMap[K]): void {
        this.features = this.model.toFeatures(this.ctx, coords)
        this.changed()
    }

    getCoordinate(path: string): Position {
        const { index, tail } = splitPath(path)
        const feature = this.#part(index)
        if (feature instanceof Point) return feature.getCoordinate()
        return feature.getCoordinate(requireTail(tail, path))
    }

    getCoordinates(): CoordinatesMap[K] {
        return jsonClone(this.model.toCoordinates(this.features))
    }

    updateCoordinate(path: string, lng: number, lat: number): void {
        const { index, tail } = splitPath(path)
        const feature = this.#part(index)
        if (feature instanceof Point) feature.updateCoordinate(tail, lng, lat)
        else feature.updateCoordinate(requireTail(tail, path), lng, lat)
        this.changed()
    }

    addCoordinate(path: string, lng: number, lat: number): void {
        const { index, tail } = splitPath(path)
        const feature = this.#part(index)
        if (feature instanceof Point) throw new TypeError("A point has no coordinates to add to")
        feature.addCoordinate(requireTail(tail, path), lng, lat)
        this.changed()
    }

    removeCoordinate(path: string): void {
        const { index, tail } = splitPath(path)
        const feature = this.#part(index)
        if (feature instanceof Point) throw new TypeError("A point has no coordinates to remove")
        feature.removeCoordinate(requireTail(tail, path))
        this.changed()
    }

    getFeatures(): MultiFeaturePart<K>[] {
        return this.features
    }
}

export default MultiFeature

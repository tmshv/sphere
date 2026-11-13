import type { Position } from "geojson"
import elementAt from "../lib/element_at"
import jsonClone from "../lib/json_clone"
import type { DrawFeatureInput } from "../types"
import Feature, { type FeatureContext } from "./feature"

/** A polygon coordinate path is `"<ring>.<position>"`; a missing part is `NaN`. */
function parsePath(path: string): [number, number] {
    const [ringIndex = Number.NaN, coordIndex = Number.NaN] = path.split(".").map(x => parseInt(x, 10))
    return [ringIndex, coordIndex]
}

/**
 * Closes a ring by repeating its first position. An empty ring has no first
 * position: it gets a single empty slot instead, which serializes as `[null]`.
 */
function closeRing(ring: Position[]): Position[] {
    const first = ring.at(0)
    if (first === undefined) return new Array<Position>(1)
    return ring.concat([first])
}

/** A polygon. Its `coordinates` hold open rings: the closing position is dropped. */
class Polygon extends Feature<"Polygon"> {
    declare coordinates: Position[][]

    constructor(ctx: FeatureContext, geojson: DrawFeatureInput<"Polygon">) {
        super(ctx, geojson)
        this.coordinates = geojson.geometry.coordinates.map(ring => ring.slice(0, -1))
    }

    isValid(): boolean {
        if (this.coordinates.length === 0) return false
        return this.coordinates.every(ring => ring.length > 2)
    }

    // Expects valid geoJSON polygon geometry: first and last positions must be equivalent.
    incomingCoords(coords: Position[][]): void {
        this.coordinates = coords.map(ring => ring.slice(0, -1))
        this.changed()
    }

    // Does NOT expect valid geoJSON polygon geometry: first and last positions should not be equivalent.
    setCoordinates(coords: Position[][]): void {
        this.coordinates = coords
        this.changed()
    }

    addCoordinate(path: string, lng: number, lat: number): void {
        this.changed()
        const [ringIndex, coordIndex] = parsePath(path)
        const ring = elementAt(this.coordinates, ringIndex)
        if (ring === undefined) throw new RangeError(`Polygon has no ring at ${path}`)
        ring.splice(coordIndex, 0, [lng, lat])
    }

    removeCoordinate(path: string): void {
        this.changed()
        const [ringIndex, coordIndex] = parsePath(path)
        const ring = elementAt(this.coordinates, ringIndex)
        if (ring) {
            ring.splice(coordIndex, 1)
            if (ring.length < 3) {
                this.coordinates.splice(ringIndex, 1)
            }
        }
    }

    getCoordinate(path: string): Position {
        const [ringIndex, coordIndex] = parsePath(path)
        const ring = elementAt(this.coordinates, ringIndex)
        if (ring === undefined) throw new RangeError(`Polygon has no ring at ${path}`)
        const coordinate = elementAt(ring, coordIndex)
        if (coordinate === undefined) throw new RangeError(`Polygon has no coordinate at ${path}`)
        return jsonClone(coordinate)
    }

    getCoordinates(): Position[][] {
        return this.coordinates.map(closeRing)
    }

    updateCoordinate(path: string, lng: number, lat: number): void {
        this.changed()
        const [ringId, coordId] = parsePath(path)

        let ring = elementAt(this.coordinates, ringId)
        if (ring === undefined) {
            ring = []
            this.coordinates[ringId] = ring
        }

        ring[coordId] = [lng, lat]
    }
}

export default Polygon

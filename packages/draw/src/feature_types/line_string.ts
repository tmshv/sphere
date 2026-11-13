import type { Position } from "geojson"
import elementAt from "../lib/element_at"
import jsonClone from "../lib/json_clone"
import Feature from "./feature"

/** A line's coordinate path is the index of the position, as a string or a number. */
function toIndex(path: string | number): number {
    return parseInt(String(path), 10)
}

class LineString extends Feature<"LineString"> {
    declare coordinates: Position[]

    isValid(): boolean {
        return this.coordinates.length > 1
    }

    addCoordinate(path: string | number, lng: number, lat: number): void {
        this.changed()
        const id = toIndex(path)
        this.coordinates.splice(id, 0, [lng, lat])
    }

    getCoordinate(path: string | number): Position {
        const id = toIndex(path)
        const coordinate = elementAt(this.coordinates, id)
        if (coordinate === undefined) throw new RangeError(`LineString has no coordinate at ${path}`)
        return jsonClone(coordinate)
    }

    removeCoordinate(path: string | number): void {
        this.changed()
        this.coordinates.splice(toIndex(path), 1)
    }

    updateCoordinate(path: string | number, lng: number, lat: number): void {
        const id = toIndex(path)
        this.coordinates[id] = [lng, lat]
        this.changed()
    }
}

export default LineString

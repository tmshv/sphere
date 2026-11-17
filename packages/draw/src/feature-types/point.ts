import type { Position } from "geojson"
import Feature from "./feature"

class Point extends Feature<"Point"> {
    declare coordinates: Position

    isValid(): boolean {
        return typeof this.coordinates.at(0) === "number" && typeof this.coordinates.at(1) === "number"
    }

    updateCoordinate(lng: number, lat: number): void
    updateCoordinate(path: string | number | null, lng: number, lat: number): void
    updateCoordinate(...args: [number, number] | [string | number | null, number, number]): void {
        // Called as (lng, lat) or, like other features, as (path, lng, lat)
        this.coordinates = args.length === 3 ? [args[1], args[2]] : [args[0], args[1]]
        this.changed()
    }

    getCoordinate(): Position {
        return this.getCoordinates()
    }
}

export default Point

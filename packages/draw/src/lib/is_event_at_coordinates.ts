import type { Position } from "geojson"
import type { LngLatValue } from "../types"

function isEventAtCoordinates(event: { lngLat?: LngLatValue }, coordinates: Position): boolean {
    if (!event.lngLat) return false
    return event.lngLat.lng === coordinates.at(0) && event.lngLat.lat === coordinates.at(1)
}

export default isEventAtCoordinates

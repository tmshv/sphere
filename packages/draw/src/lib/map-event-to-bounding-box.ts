import type { ScreenPoint } from "../types"

/** A screen-space box as two `[x, y]` corners. */
export type ScreenBox = [[number, number], [number, number]]

/**
 * Returns a bounding box representing the event's location.
 *
 * @param mapEvent - MapLibre GL JS map event, with a point properties.
 * @return Bounding box.
 */
function mapEventToBoundingBox(mapEvent: { point: ScreenPoint }, buffer = 0): ScreenBox {
    return [
        [mapEvent.point.x - buffer, mapEvent.point.y - buffer],
        [mapEvent.point.x + buffer, mapEvent.point.y + buffer],
    ]
}

export default mapEventToBoundingBox

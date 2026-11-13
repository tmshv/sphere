import type { ScreenPoint } from "../types"

/**
 * Returns a mouse event's `{ x, y }` position relative to a containing element.
 * An event without a client position (a touch event) yields `NaN` coordinates.
 */
function mouseEventPoint(mouseEvent: { clientX?: number; clientY?: number }, container: HTMLElement): ScreenPoint {
    const rect = container.getBoundingClientRect()
    return {
        x: (mouseEvent.clientX ?? Number.NaN) - rect.left - (container.clientLeft || 0),
        y: (mouseEvent.clientY ?? Number.NaN) - rect.top - (container.clientTop || 0),
    }
}

export default mouseEventPoint

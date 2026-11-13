import type { DrawMouseEvent, DrawOriginalMouseEvent } from "../types"

/** `MouseEvent.button` of the main (usually left) button. */
const MAIN_BUTTON = 0

/** A map mouse event at screen point and lng/lat `(lng, lat)`; `eventProperties` override the DOM event's. */
export default function makeMouseEvent(
    lng = 0,
    lat = 0,
    eventProperties: Partial<DrawOriginalMouseEvent> = {},
): DrawMouseEvent {
    return {
        originalEvent: {
            stopPropagation() {},
            button: MAIN_BUTTON,
            clientX: lng,
            clientY: lat,
            ...eventProperties,
        },
        point: { x: lng, y: lat },
        lngLat: { lng, lat },
    }
}

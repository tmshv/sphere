import type { DrawOriginalTouchEvent, DrawTouchEvent } from "../types"

/** `MouseEvent.button` of the main (usually left) button. */
const MAIN_BUTTON = 0

/** A map touch event at screen point and lng/lat `(lng, lat)`; `eventProperties` override the DOM event's. */
export default function makeTouchEvent(
    lng = 0,
    lat = 0,
    eventProperties: Partial<DrawOriginalTouchEvent> = {},
): DrawTouchEvent {
    // A touch event has no button; the mock carries one anyway, as upstream's did
    const originalEvent = {
        stopPropagation() {},
        preventDefault() {},
        button: MAIN_BUTTON,
        clientX: lng,
        clientY: lat,
        ...eventProperties,
    }
    return {
        originalEvent,
        point: { x: lng, y: lat },
        lngLat: { lng, lat },
    }
}

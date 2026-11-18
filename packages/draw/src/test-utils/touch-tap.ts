import type { DrawTouchEvent } from "../types"
import type { EventFirer } from "./evented"

export default function tap(map: EventFirer, payload: DrawTouchEvent): void {
    map.fire("touchstart", payload)
    map.fire("touchend", payload)
}

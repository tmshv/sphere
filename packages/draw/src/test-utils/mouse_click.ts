import type { DrawMouseEvent } from "../types"
import type { EventFirer } from "./evented"

export default function click(map: EventFirer, payload: DrawMouseEvent): void {
    map.fire("mousedown", payload)
    map.fire("mouseup", payload)
}

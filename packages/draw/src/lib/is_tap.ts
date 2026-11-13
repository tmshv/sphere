import euclideanDistance from "./euclidean_distance"
import type { PointerStamp } from "./is_click"

export const TAP_TOLERANCE = 25
export const TAP_INTERVAL = 250

export interface TapOptions {
    tolerance?: number
    interval?: number
}

/**
 * Whether `start` → `end` is a tap. A missing start point or time is
 * filled in from `end` (and written back to `start`).
 */
export default function isTap(start: Partial<PointerStamp>, end: PointerStamp, options: TapOptions = {}): boolean {
    const tolerance = options.tolerance ?? TAP_TOLERANCE
    const interval = options.interval ?? TAP_INTERVAL

    const startPoint = start.point || end.point
    const startTime = start.time || end.time
    start.point = startPoint
    start.time = startTime
    const moveDistance = euclideanDistance(startPoint, end.point)

    return moveDistance < tolerance && end.time - startTime < interval
}

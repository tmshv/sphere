import type { ScreenPoint } from "../types"
import euclideanDistance from "./euclidean_distance"

const FINE_TOLERANCE = 4
const GROSS_TOLERANCE = 12
const INTERVAL = 500

/** Where and when a pointer interaction happened. */
export interface PointerStamp {
    point: ScreenPoint
    time: number
}

export interface ClickOptions {
    fineTolerance?: number
    grossTolerance?: number
    interval?: number
}

/**
 * Whether `start` → `end` is a click. A missing start point or time is
 * filled in from `end` (and written back to `start`).
 */
export default function isClick(start: Partial<PointerStamp>, end: PointerStamp, options: ClickOptions = {}): boolean {
    const fineTolerance = options.fineTolerance ?? FINE_TOLERANCE
    const grossTolerance = options.grossTolerance ?? GROSS_TOLERANCE
    const interval = options.interval ?? INTERVAL

    const startPoint = start.point || end.point
    const startTime = start.time || end.time
    start.point = startPoint
    start.time = startTime
    const moveDistance = euclideanDistance(startPoint, end.point)

    return moveDistance < fineTolerance || (moveDistance < grossTolerance && end.time - startTime < interval)
}

import type { ScreenPoint } from "../types"

export default function euclideanDistance(a: ScreenPoint, b: ScreenPoint): number {
    const x = a.x - b.x
    const y = a.y - b.y
    return Math.sqrt(x * x + y * y)
}

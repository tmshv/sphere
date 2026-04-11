import { lerp } from "./math"

export function hist(values: number[], bins: number): number[] {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const result: number[] = Array(bins).fill(0)
    for (let i = 0; i < values.length; i++) {
        const v = values[i]
        const r = Math.floor(lerp(v, min, max, 0, bins - 1))
        result[r] += 1
    }
    return result
}

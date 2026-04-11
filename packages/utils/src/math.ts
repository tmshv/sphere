/**
 * linear interpolation of v in [min, max] range to [a, b] range
 * @param v input value
 * @param min min range of value
 * @param max max range of value
 * @param a min value of output range
 * @param b max value of output range
 */
export function lerp(v: number, min: number, max: number, a: number, b: number): number {
    const range = max - min
    const ratio = (v - min) / range
    return a + (b - a) * ratio
}

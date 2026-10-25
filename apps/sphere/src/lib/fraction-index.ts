/**
 * `count` ascending fraction indexes that sort between `prev` and `next`, so moved items slot in
 * without renumbering their neighbours. A missing neighbour means the start or end of the list.
 */
export function fractionsBetween(prev: number | undefined, next: number | undefined, count: number): number[] {
    const steps = Array.from({ length: count }, (_, i) => i + 1)
    if (prev !== undefined && next !== undefined) {
        const gap = (next - prev) / (count + 1)
        return steps.map(step => prev + gap * step)
    }
    if (next !== undefined) {
        return steps.map(step => next - (count + 1 - step))
    }
    const start = prev ?? -1
    return steps.map(step => start + step)
}

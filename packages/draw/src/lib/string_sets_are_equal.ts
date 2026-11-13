import type { FeatureId } from "../types"

export default function stringSetsAreEqual(a: readonly FeatureId[], b: readonly FeatureId[]): boolean {
    if (a.length !== b.length) return false
    return JSON.stringify(a.map(id => id).sort()) === JSON.stringify(b.map(id => id).sort())
}

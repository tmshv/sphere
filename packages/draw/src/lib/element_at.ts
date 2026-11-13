/**
 * Returns the array element at `index`, or `undefined` when `index` is not a
 * valid position in the array. Unlike `Array.prototype.at`, a negative or
 * fractional index does not count from the end or round.
 */
export default function elementAt<T>(array: readonly T[], index: number): T | undefined {
    if (!Number.isInteger(index) || index < 0) return undefined
    return array.at(index)
}

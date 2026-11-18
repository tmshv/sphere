/**
 * Returns the value, or throws (failing the test) when it is `null` or
 * `undefined`. Narrows a possibly missing value without a `!` assertion.
 */
export default function required<T>(value: T | null | undefined, message = "Expected a value, got nothing"): T {
    if (value === null || value === undefined) throw new Error(message)
    return value
}

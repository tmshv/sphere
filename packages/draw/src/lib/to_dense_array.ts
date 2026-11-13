/**
 * Derive a dense array (no `undefined`s) from a single value or array.
 */
function toDenseArray<T>(x: T | readonly (T | undefined)[] | undefined): T[] {
    const values: (T | undefined)[] = []
    return values.concat(x).filter(y => y !== undefined)
}

export default toDenseArray

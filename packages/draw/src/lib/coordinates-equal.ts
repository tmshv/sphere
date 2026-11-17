/** GeoJSON coordinates: a number or arbitrarily nested arrays of numbers. */
type NestedCoordinates = number | readonly NestedCoordinates[]

function isNested(value: NestedCoordinates | undefined): value is readonly NestedCoordinates[] {
    return Array.isArray(value)
}

/**
 * Deep equality for GeoJSON coordinates: numbers or arbitrarily nested
 * arrays of numbers.
 */
export default function coordinatesEqual(a: NestedCoordinates | undefined, b: NestedCoordinates | undefined): boolean {
    if (isNested(a) && isNested(b)) {
        return a.length === b.length && a.every((value, index) => coordinatesEqual(value, b.at(index)))
    }
    return a === b
}

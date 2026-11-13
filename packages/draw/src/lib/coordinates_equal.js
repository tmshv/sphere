/**
 * Deep equality for GeoJSON coordinates: numbers or arbitrarily nested
 * arrays of numbers.
 */
export default function coordinatesEqual(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((value, index) => coordinatesEqual(value, b[index]))
    }
    return a === b
}

/**
 * Deep copy through a JSON round trip, the way Draw has always copied
 * coordinates and features. Only for JSON data: functions and `undefined`
 * are dropped, `NaN` and holes in arrays become `null`.
 */
export default function jsonClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value))
}

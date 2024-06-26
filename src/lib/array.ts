export function head<T>(a: T[]): T | null {
    if (a.length === 0) {
        return null
    }
    return a[0]
}

export function last<T>(a: T[]): T | null {
    if (a.length === 0) {
        return null
    }
    return a[a.length - 1]
}

export function init<T>(a: T[]): T[] {
    if (a.length === 0) {
        return []
    }
    return a.slice(0, -1)
}

export function tail<T>(a: T[]): T[] {
    if (a.length === 0) {
        return []
    }
    return a.slice(1)
}

export function zip<T0, T1>(a: T0[], b: T1[]): [T0, T1][] {
    return a.reduce((acc, x, i) => {
        acc.push([x, b[i]])
        return acc
    }, [] as [T0, T1][])
}

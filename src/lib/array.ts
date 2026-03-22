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
    return a.reduce(
        (acc, x, i) => {
            acc.push([x, b[i]])
            return acc
        },
        [] as [T0, T1][],
    )
}

export function deduplicate<T, K extends string | number>(items: T[], keyFn: (item: T) => K): T[] {
    const seen = new Set<K>()
    const result: T[] = []
    for (const item of items) {
        const key = keyFn(item)
        if (!seen.has(key)) {
            seen.add(key)
            result.push(item)
        }
    }
    return result
}

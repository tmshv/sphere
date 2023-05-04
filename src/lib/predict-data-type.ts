export type Variants = "string" | "url" | "int" | "float" | "date" | "empty" | "mixed" | "unknown"

export function isInt(n: number): boolean {
    return n % 1 === 0
}

export function isNumeric(value: string): boolean {
    return /^-?\d+(\.\d+)?(e[+-]?[\d]+)?$/.test(value)
}

export function isDate(value: string): boolean {
    // // 20230504
    // if (isNumeric(value) && value.length === 8) {
    //     const y = value.substring(0, 4)
    //     const m = value.substring(4, 6)
    //     const d = value.substring(6, 8)
    //     dateString = `${y}-${m}-${d}`
    //
    //     // TODO yea I know this if looks shitty
    //     // valid year is 2XXX
    //     if (y.charAt(0) !== "2") {
    //         return false
    //     }
    // }

    const date = Date.parse(value)

    return !isNaN(date)
}

export function isUrl(value: string): boolean {
    try {
        new URL(value)
        return true
    } catch (error) {
        return false
    }
}

export function predictType<K extends string, T extends string>(key: K, samples: Record<K, T | T[]>[]): Variants {
    if (samples.length === 0) {
        return "empty"
    }

    const sample = samples[0]
    const param = sample[key]
    if (Array.isArray(param)) {
        return "mixed"
    }

    const value = param as T

    if (isNumeric(value)) {
        // if (isDate(value)) {
        //     return "date"
        // }
        const n = parseFloat(value)
        if (typeof n === "number" && !isNaN(n) && isInt(n)) {
            return "int"
        }
        if (typeof n === "number" && !isNaN(n) && !isInt(n)) {
            return "float"
        }
    }

    if (isDate(value)) {
        return "date"
    }

    if (isUrl(value)) {
        return "url"
    }

    if (typeof value === "string") {
        return "string"
    }

    return "unknown"
}

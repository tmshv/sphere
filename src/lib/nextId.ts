import { Id } from "@/types"

let start = 0

export function nextNumber(value?: number): number {
    return value ? value : start++
}

export function nextId(prefix?: string, value?: number): Id {
    const id = nextNumber(value)
    if (prefix) {
        return `${prefix}-${id}`
    }
    return `${id}`
}

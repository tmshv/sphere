let start = 0

export function nextId(prefix?: string, value?: number): string {
    const id = value ? value : start++
    if (prefix) {
        return `${prefix}-${id}`
    }
    return `${id}`
}

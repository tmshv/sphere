let start = 0

export function nextId(): string {
    const id = start ++
    return `${id}`
}

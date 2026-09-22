const BYTES_PER_UNIT = 1024
const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const
const BYTE_DECIMAL_PLACES = 1
const MS_PER_SECOND = 1000
const ISO_DATETIME_LENGTH = 19

export function formatBytes(bytes: number): string {
    if (bytes < BYTES_PER_UNIT) {
        return `${bytes} B`
    }

    let value = bytes
    let unitIndex = 0
    while (value >= BYTES_PER_UNIT && unitIndex < BYTE_UNITS.length - 1) {
        value /= BYTES_PER_UNIT
        unitIndex++
    }

    const unit = BYTE_UNITS.at(unitIndex) ?? "TB"
    return `${value.toFixed(BYTE_DECIMAL_PLACES)} ${unit}`
}

export function formatEpoch(epochSeconds: string): string {
    const seconds = Number(epochSeconds)
    if (Number.isNaN(seconds)) {
        return epochSeconds
    }

    const date = new Date(seconds * MS_PER_SECOND)
    return date.toISOString().slice(0, ISO_DATETIME_LENGTH).replace("T", " ")
}

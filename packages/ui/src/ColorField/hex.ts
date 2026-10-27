// Hex and HSV conversions with the same rounding as Mantine 5's ColorPicker:
// hue, saturation and value are whole numbers, and the hex is built from them.

export type Hsv = { h: number; s: number; v: number }

const HEX_RADIX = 16
const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
const SHORT_HEX_LENGTH = 3
const CHANNEL_MAX = 255
const PERCENT = 100
const FULL_TURN_DEGREES = 360
const HUE_SECTORS = 6
const SECTOR_DEGREES = 60
const HEX_PART_LENGTH = 2

export function isHex(color: string): boolean {
    return HEX_PATTERN.test(color)
}

function expandHex(color: string): string {
    const digits = color.startsWith("#") ? color.slice(1) : color
    if (digits.length !== SHORT_HEX_LENGTH) {
        return digits
    }
    return digits
        .split("")
        .map(digit => digit + digit)
        .join("")
}

function hueSector(r: number, g: number, b: number, max: number, delta: number): number {
    if (delta === 0) {
        return 0
    }
    if (max === r) {
        return (g - b) / delta
    }
    if (max === g) {
        return 2 + (b - r) / delta
    }
    return 4 + (r - g) / delta
}

/** Parses "#rgb" or "#rrggbb" (case-insensitive). Anything else is black. */
export function hexToHsv(color: string): Hsv {
    if (!isHex(color)) {
        return { h: 0, s: 0, v: 0 }
    }
    const digits = expandHex(color)
    const r = Number.parseInt(digits.slice(0, 2), HEX_RADIX)
    const g = Number.parseInt(digits.slice(2, 4), HEX_RADIX)
    const b = Number.parseInt(digits.slice(4, 6), HEX_RADIX)
    const max = Math.max(r, g, b)
    const delta = max - Math.min(r, g, b)
    const sector = hueSector(r, g, b, max, delta)
    const hue = SECTOR_DEGREES * (sector < 0 ? sector + HUE_SECTORS : sector)
    return {
        h: Math.round(hue),
        s: Math.round(max === 0 ? 0 : (delta / max) * PERCENT),
        v: Math.round((max / CHANNEL_MAX) * PERCENT),
    }
}

function hexPart(channel: number): string {
    return channel.toString(HEX_RADIX).padStart(HEX_PART_LENGTH, "0")
}

/** Lowercase "#rrggbb". */
export function hsvToHex({ h, s, v }: Hsv): string {
    const hue = (h / FULL_TURN_DEGREES) * HUE_SECTORS
    const saturation = s / PERCENT
    const value = v / PERCENT
    const sector = Math.floor(hue)
    const low = value * (1 - saturation)
    const falling = value * (1 - (hue - sector) * saturation)
    const rising = value * (1 - (1 - hue + sector) * saturation)
    const index = sector % HUE_SECTORS
    const channels = [
        [value, falling, low, low, rising, value],
        [rising, value, value, falling, low, low],
        [low, low, rising, value, value, falling],
    ]
    return `#${channels.map(row => hexPart(Math.round((row.at(index) ?? 0) * CHANNEL_MAX))).join("")}`
}

// Helpers that derive colours from hex palette values, so semantic tokens never need a new literal.

const HEX_RADIX = 16
const BYTE_DIGITS = 2
const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i
const LONG_HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

// A three-digit hex writes each channel once: "#abc" is "#aabbcc".
const SHORT_HEX_REPEAT = 2

export type Channels = { red: number; green: number; blue: number }

// "#rgb" or "#rrggbb" to channels in 0–255. Throws on anything else.
export function hexChannels(color: string): Channels {
    const short = SHORT_HEX.exec(color)
    const digits = short ? short.slice(1).map(digit => digit.repeat(SHORT_HEX_REPEAT)) : LONG_HEX.exec(color)?.slice(1)
    const [red, green, blue] = (digits ?? []).map(pair => Number.parseInt(pair, HEX_RADIX))
    if (red === undefined || green === undefined || blue === undefined) {
        throw new Error(`Not a hex colour: ${color}`)
    }
    return { red, green, blue }
}

function byteHex(value: number): string {
    return Math.round(value).toString(HEX_RADIX).padStart(BYTE_DIGITS, "0")
}

// "#rrggbb" to "rgba(r, g, b, alpha)".
export function withAlpha(color: string, alpha: number): string {
    const { red, green, blue } = hexChannels(color)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

// An opaque blend of `color` towards `target`; `amount` 0 is `color`, 1 is `target`. Returns "#rrggbb".
export function mix(color: string, target: string, amount: number): string {
    const from = hexChannels(color)
    const to = hexChannels(target)
    const blend = (a: number, b: number) => byteHex(a + (b - a) * amount)
    return `#${blend(from.red, to.red)}${blend(from.green, to.green)}${blend(from.blue, to.blue)}`
}

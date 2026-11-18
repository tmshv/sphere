// WCAG 2 contrast ratio between two opaque hex colours (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
import { hexChannels } from "./color"

const CHANNEL_MAX = 255

// sRGB to linear light.
const LINEAR_KNEE = 0.04045
const LINEAR_SLOPE = 12.92
const GAMMA_OFFSET = 0.055
const GAMMA_SCALE = 1.055
const GAMMA = 2.4

// Relative luminance weights of the red, green and blue channels.
const RED_WEIGHT = 0.2126
const GREEN_WEIGHT = 0.7152
const BLUE_WEIGHT = 0.0722

// The flare term WCAG adds to both luminances.
const FLARE = 0.05

function linear(channel: number): number {
    const value = channel / CHANNEL_MAX
    return value <= LINEAR_KNEE ? value / LINEAR_SLOPE : ((value + GAMMA_OFFSET) / GAMMA_SCALE) ** GAMMA
}

function luminance(color: string): number {
    const { red, green, blue } = hexChannels(color)
    return RED_WEIGHT * linear(red) + GREEN_WEIGHT * linear(green) + BLUE_WEIGHT * linear(blue)
}

export function contrastRatio(foreground: string, background: string): number {
    const first = luminance(foreground)
    const second = luminance(background)
    return (Math.max(first, second) + FLARE) / (Math.min(first, second) + FLARE)
}

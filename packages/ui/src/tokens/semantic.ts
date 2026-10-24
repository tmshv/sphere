import { palette } from "./palette"

export type ColorScheme = "light" | "dark"

export type SemanticColor =
    | "body"
    | "text"
    | "text-dimmed"
    | "accent"
    | "accent-icon"
    | "focus-ring"
    | "danger"
    | "warning-text"
    | "badge-light-bg"
    | "badge-light-text"
    | "badge-filled-bg"
    | "badge-filled-text"
    | "skeleton-cover"
    | "skeleton-bg"

export type SemanticValue = Record<ColorScheme, string>

const HEX_RADIX = 16
const HEX_PREFIX_LENGTH = 1
const BYTE_MASK = 0xff
const GREEN_SHIFT = 8
const RED_SHIFT = 16

// "#rrggbb" to "rgba(r, g, b, alpha)", the way Mantine 5's rgba() writes it.
function withAlpha(hex: string, alpha: number): string {
    const value = Number.parseInt(hex.slice(HEX_PREFIX_LENGTH), HEX_RADIX)
    const red = (value >> RED_SHIFT) & BYTE_MASK
    const green = (value >> GREEN_SHIFT) & BYTE_MASK
    const blue = value & BYTE_MASK
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const BADGE_LIGHT_DARK_ALPHA = 0.2

// Colours by role. Each entry points into the palette for both schemes.
export const semantic: Record<SemanticColor, SemanticValue> = {
    body: { light: palette.white, dark: palette.dark[7] },
    text: { light: palette.black, dark: palette.dark[0] },
    "text-dimmed": { light: palette.gray[6], dark: palette.dark[2] },
    accent: { light: palette.blue[6], dark: palette.blue[8] },
    "accent-icon": { light: palette.blue[7], dark: palette.blue[5] },
    "focus-ring": { light: palette.blue[5], dark: palette.blue[7] },
    danger: { light: palette.red[8], dark: palette.red[8] },
    "warning-text": { light: palette.orange[6], dark: palette.orange[8] },
    // Mantine 5 Badge, variant "light", primary colour (Badge.styles.js, fn.variant).
    "badge-light-bg": { light: palette.blue[0], dark: withAlpha(palette.blue[8], BADGE_LIGHT_DARK_ALPHA) },
    "badge-light-text": { light: palette.blue[6], dark: palette.blue[2] },
    // Mantine 5 Badge, variant "filled", primary colour.
    "badge-filled-bg": { light: palette.blue[6], dark: palette.blue[8] },
    "badge-filled-text": { light: palette.white, dark: palette.white },
    // Mantine 5 Skeleton.styles.js: ::before cover, ::after shimmer fill.
    "skeleton-cover": { light: palette.white, dark: palette.dark[7] },
    "skeleton-bg": { light: palette.gray[3], dark: palette.dark[4] },
}

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

export type SemanticValue = Record<ColorScheme, string>

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
}

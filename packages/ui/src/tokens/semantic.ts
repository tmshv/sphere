import { mix, withAlpha } from "./color"
import { type SchemeColor, palette } from "./palette"

export type SemanticColor =
    | "window"
    | "content"
    | "sidebar"
    | "popup"
    | "popup-border"
    | "tooltip"
    | "tooltip-text"
    | "control"
    | "control-pressed"
    | "control-border"
    | "control-shadow"
    | "separator"
    | "label"
    | "label-secondary"
    | "label-tertiary"
    | "glyph-pressed"
    | "accent"
    | "accent-pressed"
    | "accent-glyph"
    | "on-accent"
    | "selection"
    | "selection-inactive"
    | "focus-ring"
    | "danger"
    | "warning"
    | "ok"
    | "scrim"
    | "chart-bar"
    | "marker-surface"
    | "marker-shadow"

export type SemanticValue = SchemeColor

const { gray } = palette
const WHITE = gray[0]
const BLACK = gray[12]

// How far the selection and the pressed accent are shaded from the accent towards black.
const SELECTION_SHADE = 0.1
const ACCENT_PRESSED_SHADE = 0.2
// How far the dark accent is tinted towards white for a toggled-on glyph, so it keeps 3:1 (WCAG 1.4.11) on the dark
// window and on the dark control body; the light accent already does.
const ACCENT_GLYPH_DARK_TINT = 0.35
// The focus ring is a translucent glow of the accent; it is not text, so it need not meet text contrast.
const FOCUS_RING_ALPHA = 0.5
// The hairline under a push button.
const CONTROL_SHADOW_LIGHT_ALPHA = 0.15
const CONTROL_SHADOW_DARK_ALPHA = 0.4
const MARKER_SHADOW_ALPHA = 0.25
// Dialogs dim nothing: the backdrop only blocks clicks.
const TRANSPARENT = "transparent"

function both(value: string): SemanticValue {
    return { light: value, dark: value }
}

function shade(color: SemanticValue, amount: number): SemanticValue {
    return { light: mix(color.light, BLACK, amount), dark: mix(color.dark, BLACK, amount) }
}

function translucent(color: SemanticValue, alpha: number): SemanticValue {
    return { light: withAlpha(color.light, alpha), dark: withAlpha(color.dark, alpha) }
}

const label: SemanticValue = { light: BLACK, dark: gray[2] }
const accent: SemanticValue = palette.blue

// Colours by role. Each entry points into the palette (or another role) for both schemes.
export const semantic: Record<SemanticColor, SemanticValue> = {
    window: { light: gray[2], dark: gray[9] },
    content: { light: WHITE, dark: gray[11] },
    sidebar: { light: gray[1], dark: gray[10] },
    popup: { light: gray[1], dark: gray[9] },
    "popup-border": { light: gray[4], dark: gray[8] },
    tooltip: { light: gray[1], dark: gray[8] },
    "tooltip-text": label,
    control: { light: WHITE, dark: gray[8] },
    // Pressing darkens the body in both themes; in dark it drops to the window grey, so an accent glyph on a toggled-on
    // bordered button keeps 3:1.
    "control-pressed": { light: gray[3], dark: gray[9] },
    "control-border": { light: gray[4], dark: gray[10] },
    "control-shadow": {
        light: withAlpha(BLACK, CONTROL_SHADOW_LIGHT_ALPHA),
        dark: withAlpha(BLACK, CONTROL_SHADOW_DARK_ALPHA),
    },
    separator: { light: gray[4], dark: gray[8] },
    label,
    // Darker than El Capitan's secondary grey so it meets WCAG AA on window, content and sidebar.
    "label-secondary": { light: gray[7], dark: gray[5] },
    "label-tertiary": { light: gray[5], dark: gray[6] },
    "glyph-pressed": label,
    accent,
    "accent-pressed": shade(accent, ACCENT_PRESSED_SHADE),
    "accent-glyph": { light: accent.light, dark: mix(accent.dark, WHITE, ACCENT_GLYPH_DARK_TINT) },
    "on-accent": both(WHITE),
    selection: shade(accent, SELECTION_SHADE),
    "selection-inactive": { light: gray[3], dark: gray[8] },
    "focus-ring": translucent(accent, FOCUS_RING_ALPHA),
    danger: palette.red,
    warning: palette.orange,
    ok: palette.green,
    scrim: both(TRANSPARENT),
    // Component roles, by reference only.
    "chart-bar": accent,
    "marker-surface": both(WHITE),
    "marker-shadow": both(withAlpha(BLACK, MARKER_SHADOW_ALPHA)),
}

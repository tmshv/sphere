import { mix, withAlpha } from "./color"
import { type SchemeColor, palette, statusbarPalette } from "./palette"

export type SemanticColor =
    | "track"
    | "badge"
    | "chart-bar"
    | "knob"
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
    | "statusbar"
    | "statusbar-text"
    | "statusbar-glyph"
    | "statusbar-glyph-active"
    | "statusbar-fill"
    | "statusbar-error"
    | "statusbar-field"
    | "statusbar-field-text"

export type SemanticValue = SchemeColor

const { gray } = palette
const WHITE = gray[0]
const BLACK = gray[12]

// How far the pressed accent is shaded from the accent towards black.
const ACCENT_PRESSED_SHADE = 0.2
// The selection is a light blue: the accent tinted most of the way towards white (light) or towards the dark sidebar
// (dark), so it marks the active item without shouting. Text on it stays the label colour.
const SELECTION_LIGHT_TINT = 0.8
const SELECTION_DARK_TINT = 0.6
// How far the dark accent is tinted towards white for a toggled-on glyph, so it keeps 3:1 (WCAG 1.4.11) on the dark
// window and on the dark control body; the light accent already does.
const ACCENT_GLYPH_DARK_TINT = 0.35
// The focus ring is an opaque accent tinted towards white: light enough to stand apart from an accent button body, dark
// enough (light theme) or light enough (dark theme) to keep 3:1 (WCAG 1.4.11) on window, sidebar and content.
const FOCUS_RING_LIGHT_TINT = 0.15
const FOCUS_RING_DARK_TINT = 0.35
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
    // The hairline around a bordered control. Light is the El Capitan hairline; dark is one step lighter than the dark
    // control body, so it outlines a control on window, sidebar and content and parts two segments (contrast.test.ts
    // pins a 1.4:1 floor on all four).
    "control-border": { light: gray[4], dark: gray[7] },
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
    selection: {
        light: mix(accent.light, WHITE, SELECTION_LIGHT_TINT),
        dark: mix(accent.dark, gray[10], SELECTION_DARK_TINT),
    },
    "selection-inactive": { light: gray[3], dark: gray[8] },
    // The unfilled slider track: the only sign of the range, so it keeps 3:1 (WCAG 1.4.11) on window, sidebar and
    // content in both themes.
    track: both(gray[6]),
    // The fill of a light badge (a type or value tag); visible on content and on the window-coloured table header.
    badge: { light: gray[3], dark: gray[8] },
    "focus-ring": {
        light: mix(accent.light, WHITE, FOCUS_RING_LIGHT_TINT),
        dark: mix(accent.dark, WHITE, FOCUS_RING_DARK_TINT),
    },
    danger: palette.red,
    warning: palette.orange,
    ok: palette.green,
    scrim: both(TRANSPARENT),
    // Component roles, by reference only.
    "chart-bar": accent,
    // The white slider knob and the ring of the colour picker thumb.
    knob: both(WHITE),
    "marker-surface": both(WHITE),
    "marker-shadow": both(withAlpha(BLACK, MARKER_SHADOW_ALPHA)),
    // The statusbar is the same near-black strip in both themes (see statusbarPalette).
    statusbar: both(statusbarPalette.ink),
    "statusbar-text": both(statusbarPalette.text),
    "statusbar-glyph": both(statusbarPalette.glyph),
    // The glyph of the active map tool.
    "statusbar-glyph-active": both(statusbarPalette.glyphActive),
    // The body of a toggled-on fill button (the sidebar toggle), also a glyph button's pressed body.
    "statusbar-fill": both(statusbarPalette.fill),
    // The pill of an error readout, with statusbar-text on it.
    "statusbar-error": both(statusbarPalette.error),
    // The light pill of a statusbar select, with dark text.
    "statusbar-field": both(WHITE),
    "statusbar-field-text": both(BLACK),
}

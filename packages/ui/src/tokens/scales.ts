import { withAlpha } from "./color"
import { palette } from "./palette"

// Desktop density on a 4px grid (px), with 2 and 6 for hairline-tight gaps.
export const space = { 2: 2, 4: 4, 6: 6, 8: 8, 12: 12, 16: 16, 20: 20 } as const

// Radii by kind of element (px): fields, tables and panels are square; pill is the command palette search field.
export const radius = { none: 0, tooltip: 3, control: 4, popup: 5, window: 6, pill: 999 } as const

// Desktop text sizes (px): mini for statusbar and captions, small for section headers and field labels, body for
// rows, cells and inputs, regular for menus, buttons and dialogs.
export const fontSize = { mini: 10, small: 11, body: 12, regular: 13 } as const

export const fontFamily = {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
} as const

// Text is running text; tight is for single-line labels inside fixed-height controls.
export const lineHeight = { text: 1.3, tight: 1.15 } as const

export const fontWeight = { regular: 400, semibold: 600, bold: 700 } as const

// Controls are sized by fixed heights, not padding (px).
export const controlHeight = { sm: 18, md: 22 } as const
export const rowHeight = 22
export const menuItemHeight = 20
// The macOS overlay title bar the window draws its traffic lights in; sidebar content starts below it.
export const titlebarHeight = 28

const HAIRLINE = 0.5
const POPUP_OFFSET = 4
const POPUP_BLUR = 16
const POPUP_ALPHA = 0.2
const WINDOW_OFFSET = 10
const WINDOW_BLUR = 32
const WINDOW_ALPHA = 0.3
const SHADOW_COLOR = palette.gray[12]

// control: the hairline under a push button, in the scheme's control-shadow colour. popup and window: soft drop
// shadows; the popup hairline border is popup-border, drawn by the menu surface itself.
export const shadow = {
    control: `0 ${HAIRLINE}px 0 var(--sphere-color-control-shadow)`,
    popup: `0 ${POPUP_OFFSET}px ${POPUP_BLUR}px ${withAlpha(SHADOW_COLOR, POPUP_ALPHA)}`,
    window: `0 ${WINDOW_OFFSET}px ${WINDOW_BLUR}px ${withAlpha(SHADOW_COLOR, WINDOW_ALPHA)}`,
} as const

// Milliseconds: fast for fades and disclosure rotation, tooltipDelay before a tooltip opens.
export const duration = { fast: 120, tooltipDelay: 700 } as const

export const opacity = { disabled: 0.35 } as const

// Layering: app 100, modal 200, popover 300, overlay 400, max 9999.
export const zIndex = { app: 100, modal: 200, popover: 300, overlay: 400, max: 9999 } as const

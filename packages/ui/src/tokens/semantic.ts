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
    | "tooltip-bg"
    | "tooltip-text"
    | "input-bg"
    | "input-border"
    | "input-placeholder"
    | "label-text"
    | "invalid"
    | "chevron"
    | "dropdown-bg"
    | "dropdown-border"
    | "item-hover-bg"
    | "accent-hover"
    | "on-accent"
    | "button-secondary-bg"
    | "button-secondary-hover"
    | "button-disabled-bg"
    | "button-disabled-text"
    | "icon-button-text"
    | "icon-button-hover-bg"
    | "icon-button-disabled-text"
    | "icon-button-disabled-bg"
    | "segmented-bg"
    | "segmented-text"
    | "segmented-text-hover"
    | "segmented-active-bg"
    | "segmented-active-text"
    | "segmented-divider"
    | "slider-track"
    | "slider-thumb-bg"
    | "slider-thumb-border"
    | "slider-label-bg"
    | "slider-label-text"
    | "color-thumb-border"
    | "color-thumb-shadow"
    | "hue-ring"
    | "hue-glow"

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
const ICON_BUTTON_DARK_HOVER_ALPHA = 0.2
const COLOR_THUMB_SHADOW_ALPHA = 0.6
const HUE_RING_ALPHA = 0.1
const HUE_GLOW_ALPHA = 0.15

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
    // Mantine 5 Tooltip.styles.js getColors, no colour prop.
    "tooltip-bg": { light: palette.gray[9], dark: palette.dark[6] },
    "tooltip-text": { light: palette.white, dark: palette.white },
    // Mantine 5 Input.styles.js, variant "default".
    "input-bg": { light: palette.white, dark: palette.dark[6] },
    "input-border": { light: palette.gray[4], dark: palette.dark[4] },
    // Mantine 5 fn.placeholderStyles.
    "input-placeholder": { light: palette.gray[5], dark: palette.dark[3] },
    // Mantine 5 InputLabel.styles.js.
    "label-text": { light: palette.gray[9], dark: palette.dark[0] },
    // Mantine 5 fn.variant filled red: InputError, invalid input, required asterisk.
    invalid: { light: palette.red[6], dark: palette.red[8] },
    // Mantine 5 Select ChevronIcon, the same grey in both schemes.
    chevron: { light: palette.gray[6], dark: palette.gray[6] },
    // Mantine 5 Popover.styles.js dropdown.
    "dropdown-bg": { light: palette.white, dark: palette.dark[6] },
    "dropdown-border": { light: palette.gray[2], dark: palette.dark[4] },
    // Mantine 5 SelectItems.styles.js: [data-hovered] and the selected item (fn.variant filled).
    "item-hover-bg": { light: palette.gray[1], dark: palette.dark[4] },
    "accent-hover": { light: palette.blue[7], dark: palette.blue[9] },
    "on-accent": { light: palette.white, dark: palette.white },
    // Mantine 5 Button.styles.js: filled gray (secondary) and the disabled state.
    "button-secondary-bg": { light: palette.gray[6], dark: palette.gray[8] },
    "button-secondary-hover": { light: palette.gray[7], dark: palette.gray[9] },
    "button-disabled-bg": { light: palette.gray[2], dark: palette.dark[4] },
    "button-disabled-text": { light: palette.gray[5], dark: palette.dark[6] },
    // Mantine 5 ActionIcon.styles.js, gray colour, variant "subtle" and the disabled state.
    "icon-button-text": { light: palette.gray[6], dark: palette.gray[2] },
    "icon-button-hover-bg": { light: palette.gray[0], dark: withAlpha(palette.gray[8], ICON_BUTTON_DARK_HOVER_ALPHA) },
    "icon-button-disabled-text": { light: palette.gray[4], dark: palette.gray[6] },
    "icon-button-disabled-bg": { light: palette.gray[1], dark: palette.gray[8] },
    // Mantine 5 SegmentedControl.styles.js.
    "segmented-bg": { light: palette.gray[1], dark: palette.dark[8] },
    "segmented-text": { light: palette.gray[7], dark: palette.dark[1] },
    "segmented-text-hover": { light: palette.black, dark: palette.dark[0] },
    "segmented-active-bg": { light: palette.white, dark: palette.dark[5] },
    "segmented-active-text": { light: palette.black, dark: palette.white },
    "segmented-divider": { light: palette.gray[3], dark: palette.dark[4] },
    // Mantine 5 Track.styles.js: the unfilled track (gray[2] / dark[4]); the filled bar uses accent.
    "slider-track": { light: palette.gray[2], dark: palette.dark[4] },
    // Mantine 5 Slider Thumb.styles.js: white thumb with an accent border, swapped in dark.
    "slider-thumb-bg": { light: palette.white, dark: palette.blue[8] },
    "slider-thumb-border": { light: palette.blue[6], dark: palette.white },
    // Mantine 5 Slider Thumb.styles.js label: gray[9] / dark[4] with white text.
    "slider-label-bg": { light: palette.gray[9], dark: palette.dark[4] },
    "slider-label-text": { light: palette.white, dark: palette.white },
    // Mantine 5 ColorPicker Thumb.styles.js: 2px white border.
    "color-thumb-border": { light: palette.white, dark: palette.white },
    // Mantine 5 ColorPicker Thumb.styles.js: boxShadow 0 0 1px rgba(0, 0, 0, .6).
    "color-thumb-shadow": {
        light: withAlpha(palette.black, COLOR_THUMB_SHADOW_ALPHA),
        dark: withAlpha(palette.black, COLOR_THUMB_SHADOW_ALPHA),
    },
    // Mantine 5 HueSlider.js: the two inset shadows over the hue spectrum (1px ring, 4px glow).
    "hue-ring": { light: withAlpha(palette.black, HUE_RING_ALPHA), dark: withAlpha(palette.black, HUE_RING_ALPHA) },
    "hue-glow": { light: withAlpha(palette.black, HUE_GLOW_ALPHA), dark: withAlpha(palette.black, HUE_GLOW_ALPHA) },
}

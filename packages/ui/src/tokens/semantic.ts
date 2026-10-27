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
    | "badge-outline-dark"
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
    | "tab-bg"
    | "tab-border"
    | "tab-text"
    | "tab-active-bg"
    | "overlay"
    | "menu-item-hover-bg"
    | "menu-item-disabled-text"
    | "input-icon"
    | "palette-overlay"
    | "separator"
    | "split-focus"
    | "section-header-bg"
    | "section-header-text"
    | "statusbar-bg"
    | "statusbar-text"
    | "statusbar-icon"
    | "statusbar-icon-accent"
    | "statusbar-icon-hover-bg"
    | "statusbar-icon-disabled"
    | "toolbar-border"
    | "toolbar-link-text"
    | "toolbar-link-hover-bg"
    | "toolbar-active-bg"
    | "toolbar-active-text"
    | "button-light-bg"
    | "button-light-text"
    | "button-light-hover"
    | "button-subtle-hover"
    | "tree-row-text"
    | "tree-row-hover-bg"
    | "tree-row-selected-bg"
    | "tree-row-selected-hover-bg"
    | "marker-surface"
    | "marker-shadow"
    | "table-border"
    | "table-resizer"
    | "chart-bar"

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
const MODAL_OVERLAY_LIGHT_ALPHA = 0.75
const MODAL_OVERLAY_DARK_ALPHA = 0.85
const MENU_ITEM_DARK_HOVER_ALPHA = 0.35
const PALETTE_OVERLAY_ALPHA = 0.25
const TOOLBAR_ACTIVE_DARK_ALPHA = 0.2
const BUTTON_LIGHT_DARK_ALPHA = 0.2
const BUTTON_LIGHT_HOVER_LIGHT_ALPHA = 0.65
const BUTTON_LIGHT_HOVER_DARK_ALPHA = 0.25
const TREE_ROW_SELECTED_DARK_ALPHA = 0.2
const TREE_ROW_SELECTED_HOVER_LIGHT_ALPHA = 0.65
const TREE_ROW_SELECTED_HOVER_DARK_ALPHA = 0.25

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
    // Mantine 5 fn.variant "outline", colour dark: border and text are dark[6] (light) / dark[5] (dark).
    "badge-outline-dark": { light: palette.dark[6], dark: palette.dark[5] },
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
    // Sphere Tabs (moved from LeftSidebar): white or dark[6] fill, gray[4] or dark[6] border, gray[9] or dark[0] text.
    "tab-bg": { light: palette.white, dark: palette.dark[6] },
    "tab-border": { light: palette.gray[4], dark: palette.dark[6] },
    "tab-text": { light: palette.gray[9], dark: palette.dark[0] },
    // Sphere Tabs, active tab: blue[7] fill and border in both schemes (text is on-accent).
    "tab-active-bg": { light: palette.blue[7], dark: palette.blue[7] },
    // Mantine 5 Modal overlay: black at 0.75 (light), dark[9] at 0.85 (dark).
    overlay: {
        light: withAlpha(palette.black, MODAL_OVERLAY_LIGHT_ALPHA),
        dark: withAlpha(palette.dark[9], MODAL_OVERLAY_DARK_ALPHA),
    },
    // Mantine 5 MenuItem.styles.js: [data-hovered] (gray[1] / dark[3] at .35) and :disabled (gray[5] / dark[3]).
    "menu-item-hover-bg": { light: palette.gray[1], dark: withAlpha(palette.dark[3], MENU_ITEM_DARK_HOVER_ALPHA) },
    "menu-item-disabled-text": { light: palette.gray[5], dark: palette.dark[3] },
    // Mantine 5 Input.styles.js icon (not invalid): gray[5] / dark[2].
    "input-icon": { light: palette.gray[5], dark: palette.dark[2] },
    // Mantine 5 Spotlight.js overlay: overlayColor #000 at overlayOpacity .25, both schemes.
    "palette-overlay": {
        light: withAlpha(palette.black, PALETTE_OVERLAY_ALPHA),
        dark: withAlpha(palette.black, PALETTE_OVERLAY_ALPHA),
    },
    // Sphere Split: allotment --separator-border (gray[3] / gray[8]); also the SectionStack header's top border.
    separator: { light: palette.gray[3], dark: palette.gray[8] },
    // Sphere Split: allotment --focus-border, blue[7] in both schemes.
    "split-focus": { light: palette.blue[7], dark: palette.blue[7] },
    // Sphere SectionStack header: white / gray[9] fill, gray[9] / dark[0] text.
    "section-header-bg": { light: palette.white, dark: palette.gray[9] },
    "section-header-text": { light: palette.gray[9], dark: palette.dark[0] },
    // Sphere Statusbar: gray[1] text; icons keep the light-scheme look (gray[6] / yellow[6]) in both themes,
    // gray[8] for hover, filled and disabled.
    // `backgroundColor: theme.colors.dark` is an array; emotion writes one declaration per entry and the last, dark[9], wins.
    "statusbar-bg": { light: palette.dark[9], dark: palette.dark[9] },
    "statusbar-text": { light: palette.gray[1], dark: palette.gray[1] },
    "statusbar-icon": { light: palette.gray[6], dark: palette.gray[6] },
    "statusbar-icon-accent": { light: palette.yellow[6], dark: palette.yellow[6] },
    "statusbar-icon-hover-bg": { light: palette.gray[8], dark: palette.gray[8] },
    "statusbar-icon-disabled": { light: palette.gray[8], dark: palette.gray[8] },
    // Sphere Toolbar: the literal #f0f0f0 / #0f0f0f border, gray[7] / dark[0] link text, gray[0] / dark[5] hover.
    "toolbar-border": { light: "#f0f0f0", dark: "#0f0f0f" },
    "toolbar-link-text": { light: palette.gray[7], dark: palette.dark[0] },
    "toolbar-link-hover-bg": { light: palette.gray[0], dark: palette.dark[5] },
    // Mantine 5 fn.variant light, primary colour (the same values as the light Badge).
    "toolbar-active-bg": { light: palette.blue[0], dark: withAlpha(palette.blue[8], TOOLBAR_ACTIVE_DARK_ALPHA) },
    "toolbar-active-text": { light: palette.blue[6], dark: palette.blue[2] },
    // Mantine 5 fn.variant "light" and "subtle", primary colour: Button size xs in the error fallback.
    "button-light-bg": { light: palette.blue[0], dark: withAlpha(palette.blue[8], BUTTON_LIGHT_DARK_ALPHA) },
    "button-light-text": { light: palette.blue[6], dark: palette.blue[2] },
    "button-light-hover": {
        light: withAlpha(palette.blue[1], BUTTON_LIGHT_HOVER_LIGHT_ALPHA),
        dark: withAlpha(palette.blue[7], BUTTON_LIGHT_HOVER_DARK_ALPHA),
    },
    "button-subtle-hover": { light: palette.blue[0], dark: withAlpha(palette.blue[8], BUTTON_LIGHT_DARK_ALPHA) },
    // Sphere TreeRow: black / white text, gray[0] / dark[6] hover.
    "tree-row-text": { light: palette.black, dark: palette.white },
    "tree-row-hover-bg": { light: palette.gray[0], dark: palette.dark[6] },
    // Sphere TreeRow, selected: Mantine 5 variant("light", blue) background and hover.
    "tree-row-selected-bg": { light: palette.blue[0], dark: withAlpha(palette.blue[8], TREE_ROW_SELECTED_DARK_ALPHA) },
    "tree-row-selected-hover-bg": {
        light: withAlpha(palette.blue[1], TREE_ROW_SELECTED_HOVER_LIGHT_ALPHA),
        dark: withAlpha(palette.blue[7], TREE_ROW_SELECTED_HOVER_DARK_ALPHA),
    },
    // Sphere ImageMarker: white fill and 3px border, shadow rgba(0, 0, 30, 0.25), the same in both schemes.
    "marker-surface": { light: palette.white, dark: palette.white },
    "marker-shadow": { light: "rgba(0, 0, 30, 0.25)", dark: "rgba(0, 0, 30, 0.25)" },
    // Sphere PropertiesTable: gray[1] cell borders in both schemes (theme.colors.gray[1] is not scheme-aware).
    "table-border": { light: palette.gray[1], dark: palette.gray[1] },
    // Sphere PropertiesTable resizer: `background: theme.primaryColor` is the string "blue", which CSS reads
    // as the keyword (pure #0000ff), not the palette blue. Kept as rendered.
    "table-resizer": { light: "blue", dark: "blue" },
    // Sphere PropertiesTable histogram: rgb(34, 139, 230), palette blue[6], in both schemes.
    "chart-bar": { light: palette.blue[6], dark: palette.blue[6] },
}

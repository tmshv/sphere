// The Mantine 5 tokens every component used before the desktop design system. Kept only while components
// migrate onto the new roles in semantic.ts and scales.ts; tokensToCss() emits them next to the new set, and the
// new set wins where a name is in both. Delete this file once no CSS references a legacy name.
import { withAlpha } from "./color"
import type { SemanticValue } from "./semantic"

// Raw colours copied verbatim from the Mantine 5.10.5 default colours.
type Shades = readonly [string, string, string, string, string, string, string, string, string, string]

type LegacyHue = "dark" | "gray" | "red" | "yellow" | "orange" | "blue"

type LegacyPalette = Record<LegacyHue, Shades> & { white: string; black: string }

export const legacyPalette: LegacyPalette = {
    white: "#fff",
    black: "#000",
    dark: [
        "#C1C2C5",
        "#A6A7AB",
        "#909296",
        "#5c5f66",
        "#373A40",
        "#2C2E33",
        "#25262b",
        "#1A1B1E",
        "#141517",
        "#101113",
    ],
    gray: [
        "#f8f9fa",
        "#f1f3f5",
        "#e9ecef",
        "#dee2e6",
        "#ced4da",
        "#adb5bd",
        "#868e96",
        "#495057",
        "#343a40",
        "#212529",
    ],
    red: ["#fff5f5", "#ffe3e3", "#ffc9c9", "#ffa8a8", "#ff8787", "#ff6b6b", "#fa5252", "#f03e3e", "#e03131", "#c92a2a"],
    yellow: [
        "#fff9db",
        "#fff3bf",
        "#ffec99",
        "#ffe066",
        "#ffd43b",
        "#fcc419",
        "#fab005",
        "#f59f00",
        "#f08c00",
        "#e67700",
    ],
    orange: [
        "#fff4e6",
        "#ffe8cc",
        "#ffd8a8",
        "#ffc078",
        "#ffa94d",
        "#ff922b",
        "#fd7e14",
        "#f76707",
        "#e8590c",
        "#d9480f",
    ],
    blue: [
        "#e7f5ff",
        "#d0ebff",
        "#a5d8ff",
        "#74c0fc",
        "#4dabf7",
        "#339af0",
        "#228be6",
        "#1c7ed6",
        "#1971c2",
        "#1864ab",
    ],
}

export type LegacySemanticColor =
    | "body"
    | "text"
    | "text-dimmed"
    | "accent-icon"
    | "warning-text"
    | "badge-light-bg"
    | "badge-light-text"
    | "badge-filled-bg"
    | "badge-filled-text"
    | "badge-outline-dark"
    | "skeleton-cover"
    | "skeleton-bg"
    | "tooltip-bg"
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
    | "table-border"
    | "table-resizer"

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

// Colours by role. Each entry points into the legacy palette for both schemes.
export const legacySemantic: Record<LegacySemanticColor, SemanticValue> = {
    body: { light: legacyPalette.white, dark: legacyPalette.dark[7] },
    text: { light: legacyPalette.black, dark: legacyPalette.dark[0] },
    "text-dimmed": { light: legacyPalette.gray[6], dark: legacyPalette.dark[2] },
    "accent-icon": { light: legacyPalette.blue[7], dark: legacyPalette.blue[5] },
    "warning-text": { light: legacyPalette.orange[6], dark: legacyPalette.orange[8] },
    // Mantine 5 Badge, variant "light", primary colour (Badge.styles.js, fn.variant).
    "badge-light-bg": { light: legacyPalette.blue[0], dark: withAlpha(legacyPalette.blue[8], BADGE_LIGHT_DARK_ALPHA) },
    "badge-light-text": { light: legacyPalette.blue[6], dark: legacyPalette.blue[2] },
    // Mantine 5 Badge, variant "filled", primary colour.
    "badge-filled-bg": { light: legacyPalette.blue[6], dark: legacyPalette.blue[8] },
    "badge-filled-text": { light: legacyPalette.white, dark: legacyPalette.white },
    // Mantine 5 fn.variant "outline", colour dark: border and text are dark[6] (light) / dark[5] (dark).
    "badge-outline-dark": { light: legacyPalette.dark[6], dark: legacyPalette.dark[5] },
    // Mantine 5 Skeleton.styles.js: ::before cover, ::after shimmer fill.
    "skeleton-cover": { light: legacyPalette.white, dark: legacyPalette.dark[7] },
    "skeleton-bg": { light: legacyPalette.gray[3], dark: legacyPalette.dark[4] },
    // Mantine 5 Tooltip.styles.js getColors, no colour prop.
    "tooltip-bg": { light: legacyPalette.gray[9], dark: legacyPalette.dark[6] },
    // Mantine 5 Input.styles.js, variant "default".
    "input-bg": { light: legacyPalette.white, dark: legacyPalette.dark[6] },
    "input-border": { light: legacyPalette.gray[4], dark: legacyPalette.dark[4] },
    // Mantine 5 fn.placeholderStyles.
    "input-placeholder": { light: legacyPalette.gray[5], dark: legacyPalette.dark[3] },
    // Mantine 5 InputLabel.styles.js.
    "label-text": { light: legacyPalette.gray[9], dark: legacyPalette.dark[0] },
    // Mantine 5 fn.variant filled red: InputError, invalid input, required asterisk.
    invalid: { light: legacyPalette.red[6], dark: legacyPalette.red[8] },
    // Mantine 5 Select ChevronIcon, the same grey in both schemes.
    chevron: { light: legacyPalette.gray[6], dark: legacyPalette.gray[6] },
    // Mantine 5 Popover.styles.js dropdown.
    "dropdown-bg": { light: legacyPalette.white, dark: legacyPalette.dark[6] },
    "dropdown-border": { light: legacyPalette.gray[2], dark: legacyPalette.dark[4] },
    // Mantine 5 SelectItems.styles.js: [data-hovered] and the selected item (fn.variant filled).
    "item-hover-bg": { light: legacyPalette.gray[1], dark: legacyPalette.dark[4] },
    "accent-hover": { light: legacyPalette.blue[7], dark: legacyPalette.blue[9] },
    // Mantine 5 Button.styles.js: filled gray (secondary) and the disabled state.
    "button-secondary-bg": { light: legacyPalette.gray[6], dark: legacyPalette.gray[8] },
    "button-secondary-hover": { light: legacyPalette.gray[7], dark: legacyPalette.gray[9] },
    "button-disabled-bg": { light: legacyPalette.gray[2], dark: legacyPalette.dark[4] },
    "button-disabled-text": { light: legacyPalette.gray[5], dark: legacyPalette.dark[6] },
    // Mantine 5 ActionIcon.styles.js, gray colour, variant "subtle" and the disabled state.
    "icon-button-text": { light: legacyPalette.gray[6], dark: legacyPalette.gray[2] },
    "icon-button-hover-bg": {
        light: legacyPalette.gray[0],
        dark: withAlpha(legacyPalette.gray[8], ICON_BUTTON_DARK_HOVER_ALPHA),
    },
    "icon-button-disabled-text": { light: legacyPalette.gray[4], dark: legacyPalette.gray[6] },
    "icon-button-disabled-bg": { light: legacyPalette.gray[1], dark: legacyPalette.gray[8] },
    // Mantine 5 SegmentedControl.styles.js.
    "segmented-bg": { light: legacyPalette.gray[1], dark: legacyPalette.dark[8] },
    "segmented-text": { light: legacyPalette.gray[7], dark: legacyPalette.dark[1] },
    "segmented-text-hover": { light: legacyPalette.black, dark: legacyPalette.dark[0] },
    "segmented-active-bg": { light: legacyPalette.white, dark: legacyPalette.dark[5] },
    "segmented-active-text": { light: legacyPalette.black, dark: legacyPalette.white },
    "segmented-divider": { light: legacyPalette.gray[3], dark: legacyPalette.dark[4] },
    // Mantine 5 Track.styles.js: the unfilled track (gray[2] / dark[4]); the filled bar uses accent.
    "slider-track": { light: legacyPalette.gray[2], dark: legacyPalette.dark[4] },
    // Mantine 5 Slider Thumb.styles.js: white thumb with an accent border, swapped in dark.
    "slider-thumb-bg": { light: legacyPalette.white, dark: legacyPalette.blue[8] },
    "slider-thumb-border": { light: legacyPalette.blue[6], dark: legacyPalette.white },
    // Mantine 5 Slider Thumb.styles.js label: gray[9] / dark[4] with white text.
    "slider-label-bg": { light: legacyPalette.gray[9], dark: legacyPalette.dark[4] },
    "slider-label-text": { light: legacyPalette.white, dark: legacyPalette.white },
    // Mantine 5 ColorPicker Thumb.styles.js: 2px white border.
    "color-thumb-border": { light: legacyPalette.white, dark: legacyPalette.white },
    // Mantine 5 ColorPicker Thumb.styles.js: boxShadow 0 0 1px rgba(0, 0, 0, .6).
    "color-thumb-shadow": {
        light: withAlpha(legacyPalette.black, COLOR_THUMB_SHADOW_ALPHA),
        dark: withAlpha(legacyPalette.black, COLOR_THUMB_SHADOW_ALPHA),
    },
    // Mantine 5 HueSlider.js: the two inset shadows over the hue spectrum (1px ring, 4px glow).
    "hue-ring": {
        light: withAlpha(legacyPalette.black, HUE_RING_ALPHA),
        dark: withAlpha(legacyPalette.black, HUE_RING_ALPHA),
    },
    "hue-glow": {
        light: withAlpha(legacyPalette.black, HUE_GLOW_ALPHA),
        dark: withAlpha(legacyPalette.black, HUE_GLOW_ALPHA),
    },
    // Sphere Tabs (moved from LeftSidebar): white or dark[6] fill, gray[4] or dark[6] border, gray[9] or dark[0] text.
    "tab-bg": { light: legacyPalette.white, dark: legacyPalette.dark[6] },
    "tab-border": { light: legacyPalette.gray[4], dark: legacyPalette.dark[6] },
    "tab-text": { light: legacyPalette.gray[9], dark: legacyPalette.dark[0] },
    // Sphere Tabs, active tab: blue[7] fill and border in both schemes (text is on-accent).
    "tab-active-bg": { light: legacyPalette.blue[7], dark: legacyPalette.blue[7] },
    // Mantine 5 Modal overlay: black at 0.75 (light), dark[9] at 0.85 (dark).
    overlay: {
        light: withAlpha(legacyPalette.black, MODAL_OVERLAY_LIGHT_ALPHA),
        dark: withAlpha(legacyPalette.dark[9], MODAL_OVERLAY_DARK_ALPHA),
    },
    // Mantine 5 MenuItem.styles.js: [data-hovered] (gray[1] / dark[3] at .35) and :disabled (gray[5] / dark[3]).
    "menu-item-hover-bg": {
        light: legacyPalette.gray[1],
        dark: withAlpha(legacyPalette.dark[3], MENU_ITEM_DARK_HOVER_ALPHA),
    },
    "menu-item-disabled-text": { light: legacyPalette.gray[5], dark: legacyPalette.dark[3] },
    // Mantine 5 Input.styles.js icon (not invalid): gray[5] / dark[2].
    "input-icon": { light: legacyPalette.gray[5], dark: legacyPalette.dark[2] },
    // Mantine 5 Spotlight.js overlay: overlayColor #000 at overlayOpacity .25, both schemes.
    "palette-overlay": {
        light: withAlpha(legacyPalette.black, PALETTE_OVERLAY_ALPHA),
        dark: withAlpha(legacyPalette.black, PALETTE_OVERLAY_ALPHA),
    },
    // Sphere Split: allotment --focus-border, blue[7] in both schemes.
    "split-focus": { light: legacyPalette.blue[7], dark: legacyPalette.blue[7] },
    // Sphere SectionStack header: white / gray[9] fill, gray[9] / dark[0] text.
    "section-header-bg": { light: legacyPalette.white, dark: legacyPalette.gray[9] },
    "section-header-text": { light: legacyPalette.gray[9], dark: legacyPalette.dark[0] },
    // Sphere Statusbar: gray[1] text; icons keep the light-scheme look (gray[6] / yellow[6]) in both themes,
    // gray[8] for hover, filled and disabled.
    // `backgroundColor: theme.colors.dark` is an array; emotion writes one declaration per entry and the last, dark[9], wins.
    "statusbar-bg": { light: legacyPalette.dark[9], dark: legacyPalette.dark[9] },
    "statusbar-text": { light: legacyPalette.gray[1], dark: legacyPalette.gray[1] },
    "statusbar-icon": { light: legacyPalette.gray[6], dark: legacyPalette.gray[6] },
    "statusbar-icon-accent": { light: legacyPalette.yellow[6], dark: legacyPalette.yellow[6] },
    "statusbar-icon-hover-bg": { light: legacyPalette.gray[8], dark: legacyPalette.gray[8] },
    "statusbar-icon-disabled": { light: legacyPalette.gray[8], dark: legacyPalette.gray[8] },
    // Sphere Toolbar: the literal #f0f0f0 / #0f0f0f border, gray[7] / dark[0] link text, gray[0] / dark[5] hover.
    "toolbar-border": { light: "#f0f0f0", dark: "#0f0f0f" },
    "toolbar-link-text": { light: legacyPalette.gray[7], dark: legacyPalette.dark[0] },
    "toolbar-link-hover-bg": { light: legacyPalette.gray[0], dark: legacyPalette.dark[5] },
    // Mantine 5 fn.variant light, primary colour (the same values as the light Badge).
    "toolbar-active-bg": {
        light: legacyPalette.blue[0],
        dark: withAlpha(legacyPalette.blue[8], TOOLBAR_ACTIVE_DARK_ALPHA),
    },
    "toolbar-active-text": { light: legacyPalette.blue[6], dark: legacyPalette.blue[2] },
    // Mantine 5 fn.variant "light" and "subtle", primary colour: Button size xs in the error fallback.
    "button-light-bg": {
        light: legacyPalette.blue[0],
        dark: withAlpha(legacyPalette.blue[8], BUTTON_LIGHT_DARK_ALPHA),
    },
    "button-light-text": { light: legacyPalette.blue[6], dark: legacyPalette.blue[2] },
    "button-light-hover": {
        light: withAlpha(legacyPalette.blue[1], BUTTON_LIGHT_HOVER_LIGHT_ALPHA),
        dark: withAlpha(legacyPalette.blue[7], BUTTON_LIGHT_HOVER_DARK_ALPHA),
    },
    "button-subtle-hover": {
        light: legacyPalette.blue[0],
        dark: withAlpha(legacyPalette.blue[8], BUTTON_LIGHT_DARK_ALPHA),
    },
    // Sphere TreeRow: black / white text, gray[0] / dark[6] hover.
    "tree-row-text": { light: legacyPalette.black, dark: legacyPalette.white },
    "tree-row-hover-bg": { light: legacyPalette.gray[0], dark: legacyPalette.dark[6] },
    // Sphere TreeRow, selected: Mantine 5 variant("light", blue) background and hover.
    "tree-row-selected-bg": {
        light: legacyPalette.blue[0],
        dark: withAlpha(legacyPalette.blue[8], TREE_ROW_SELECTED_DARK_ALPHA),
    },
    "tree-row-selected-hover-bg": {
        light: withAlpha(legacyPalette.blue[1], TREE_ROW_SELECTED_HOVER_LIGHT_ALPHA),
        dark: withAlpha(legacyPalette.blue[7], TREE_ROW_SELECTED_HOVER_DARK_ALPHA),
    },
    // Sphere PropertiesTable: gray[1] cell borders in both schemes (theme.colors.gray[1] is not scheme-aware).
    "table-border": { light: legacyPalette.gray[1], dark: legacyPalette.gray[1] },
    // Sphere PropertiesTable resizer: `background: theme.primaryColor` is the string "blue", which CSS reads
    // as the keyword (pure #0000ff), not the palette blue. Kept as rendered.
    "table-resizer": { light: "blue", dark: "blue" },
}

// Scale values the desktop set does not redefine: Mantine 5 defaults plus Sphere's former ThemeProvider overrides
// (spacing.xs = 4, spacing.xl = 28).
export const legacyScales = {
    space: { xxs: 2, xs: 4, sm: 12, md: 16, lg: 20, xl: 28 },
    radius: { xs: 2, sm: 4, md: 8, lg: 16, xl: 32 },
    fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 },
    // Body is Mantine's theme.lineHeight; heading is the h3 line height.
    lineHeight: { body: 1.55, heading: 1.4 },
    fontWeight: { normal: 400, medium: 500 },
    shadow: {
        xs: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
        sm: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 10px 15px -5px, rgba(0, 0, 0, 0.04) 0px 7px 7px -5px",
        md: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px",
        lg: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 28px 23px -7px, rgba(0, 0, 0, 0.04) 0px 12px 12px -7px",
        xl: "0 1px 3px rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0px 36px 28px -7px, rgba(0, 0, 0, 0.04) 0px 17px 17px -7px",
    },
    // Milliseconds. Mantine 5 popups ran 200ms; its 100ms control transition is replaced by the new duration-fast.
    duration: { normal: 200 },
} as const

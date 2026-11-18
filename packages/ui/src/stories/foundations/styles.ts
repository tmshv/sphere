import type { CSSProperties } from "react"

// Layout constants shared by the Foundations pages (px).
export const PAGE_PADDING = 16
export const ROW_GAP = 12
export const ROW_PADDING = "4px 0"
export const GRID_GAP = 24
export const LABEL_WIDTH = 100
export const NAME_WIDTH = 200
export const SWATCH_SIZE = 40
export const SWATCH_RADIUS = 4
export const VALUE_FONT_SIZE = 11
export const DIMMED_OPACITY = 0.7
export const SAMPLE_MAX_WIDTH = 320
export const SAMPLE_BOX_SIZE = 64
export const SHADOW_BOX_SIZE = 96
export const SHADOW_GRID_GAP = 32
export const SHADOW_LABEL_GAP = 8
export const BAR_HEIGHT = 16
export const OUTLINE = "2px solid currentColor"
export const HAIRLINE = "1px solid rgba(128, 128, 128, 0.4)"

export const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: ROW_GAP,
    padding: ROW_PADDING,
}

export const baselineRowStyle: CSSProperties = { ...rowStyle, alignItems: "baseline" }

export const labelStyle: CSSProperties = { width: LABEL_WIDTH }

export const wrapStyle: CSSProperties = { display: "flex", flexWrap: "wrap", gap: GRID_GAP }
export const NAME_WEIGHT = 600
export const HEIGHT_SAMPLE_WIDTH = 120
// Motion bars are drawn at one pixel per this many milliseconds.
export const MS_PER_PX = 2

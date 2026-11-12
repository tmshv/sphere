import type { CSSProperties } from "react"

// Layout constants shared by component stories (px).
export const ICON_SIZE = 16
export const FIELD_WIDTH = 240
export const WIDE_FIELD_WIDTH = 320
export const GALLERY_GAP = 16
export const GALLERY_PADDING = 16
export const OVERLAY_MIN_HEIGHT = 360
export const TOOLTIP_TRIGGER_PADDING = 48
export const CONTEXT_MENU_POSITION: [number, number] = [24, 24]

export const fieldStyle: CSSProperties = { width: FIELD_WIDTH }
export const wideFieldStyle: CSSProperties = { width: WIDE_FIELD_WIDTH }
export const galleryStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: GALLERY_GAP,
    padding: GALLERY_PADDING,
}
export const overlayStyle: CSSProperties = { minHeight: OVERLAY_MIN_HEIGHT }
export const tooltipTriggerStyle: CSSProperties = { padding: TOOLTIP_TRIGGER_PADDING }

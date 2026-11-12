import type { CSSProperties } from "react"

// Layout constants shared by component stories (px).
export const ICON_SIZE = 16
export const FIELD_WIDTH = 240
export const GALLERY_GAP = 16
export const GALLERY_PADDING = 16
export const OVERLAY_MIN_HEIGHT = 360
export const TOOLTIP_TRIGGER_PADDING = 48
export const CONTEXT_MENU_POSITION: [number, number] = [24, 24]

export const fieldStyle: CSSProperties = { width: FIELD_WIDTH }
export const galleryStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: GALLERY_GAP,
    padding: GALLERY_PADDING,
}
export const overlayStyle: CSSProperties = { minHeight: OVERLAY_MIN_HEIGHT }
export const tooltipTriggerStyle: CSSProperties = { padding: TOOLTIP_TRIGGER_PADDING }

export const DIALOG_FIELD_WIDTH = 320
export const TREE_HEIGHT = 280
export const TREE_WIDTH = 280
export const TABLE_HEIGHT = 240
export const TABLE_WIDTH = 640
export const SECTION_STACK_HEIGHT = 420
export const SECTION_STACK_WIDTH = 280
export const SECTION_MIN_CONTENT_SIZE = 40
export const SPLIT_HEIGHT = 200
export const SPLIT_WIDTH = 480
export const SPLIT_DEFAULT_SIZES = [160, 320]
export const PANE_PADDING = 8
export const APP_LAYOUT_HEIGHT = 320
export const APP_LAYOUT_SIDEBAR_SIZE = { preferred: 140, min: 80, max: 220 }
export const SIDEBAR_HEIGHT = 200
export const SIDEBAR_WIDTH = 240
export const PANEL_HEIGHT = 160
export const PANEL_WIDTH = 240
export const IMAGE_MARKER_SIZE = 40
export const BOX_SIZE = 40
export const BOX_TALL_SIZE = 72
export const ROW_STACK_WIDTH = 320
export const INFO_ROW_WIDTH = 280
export const ATTRIBUTE_LIST_WIDTH = 280

export const paneStyle: CSSProperties = { padding: PANE_PADDING, fontSize: ICON_SIZE }
export const splitStyle: CSSProperties = { width: SPLIT_WIDTH, height: SPLIT_HEIGHT }
export const treeStyle: CSSProperties = { width: TREE_WIDTH, height: TREE_HEIGHT, display: "flex" }
export const tableStyle: CSSProperties = { width: TABLE_WIDTH, height: TABLE_HEIGHT, display: "flex" }
export const sectionStackStyle: CSSProperties = {
    width: SECTION_STACK_WIDTH,
    height: SECTION_STACK_HEIGHT,
    display: "flex",
    flexDirection: "column",
}
export const appLayoutStyle: CSSProperties = { height: APP_LAYOUT_HEIGHT, width: "100%" }
export const sidebarFrameStyle: CSSProperties = { width: SIDEBAR_WIDTH, height: SIDEBAR_HEIGHT }
export const panelFrameStyle: CSSProperties = {
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    display: "flex",
    flexDirection: "column",
}
export const infoRowStyle: CSSProperties = { width: INFO_ROW_WIDTH }
export const attributeListStyle: CSSProperties = { width: ATTRIBUTE_LIST_WIDTH }
export const rowStackStyle: CSSProperties = { width: ROW_STACK_WIDTH }
export const boxStyle: CSSProperties = {
    width: BOX_SIZE,
    height: BOX_SIZE,
    background: "var(--sphere-color-selection)",
}
export const tallBoxStyle: CSSProperties = { ...boxStyle, height: BOX_TALL_SIZE }
export const overlayFrameStyle: CSSProperties = { ...overlayStyle, position: "relative" }
export const STATUSBAR_ICON_SIZE = 14

// Compositions: a fixed window frame so screens look like an app window.
export const WINDOW_WIDTH = 1200
export const WINDOW_HEIGHT = 760
export const WINDOW_SIDEBAR_SIZE = { preferred: 300, min: 265, max: 500 }
export const MAP_HATCH_SIZE = 12
export const MAP_HATCH_LINE = 1
export const MAP_CAPTION_SIZE = 13
export const MAP_CAPTION_PADDING = "2px 8px"
export const MAP_CAPTION_RADIUS = 4
export const MENU_ROW_OFFSET = 24
export const MENU_ANCHOR_ROW_TEXT = "Cadastral parcels"
export const TREE_ROW_SELECTOR = '[role="treeitem"]'

export const windowFrameStyle: CSSProperties = {
    position: "relative",
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    overflow: "hidden",
    background: "var(--sphere-color-window)",
    color: "var(--sphere-color-label)",
    fontFamily: "var(--sphere-font-family-sans)",
}
export const statusbarSpacerStyle: CSSProperties = { flex: 1 }
export const mapPlaceholderStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "var(--sphere-color-content)",
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0 ${MAP_HATCH_SIZE - MAP_HATCH_LINE}px, var(--sphere-color-separator) ${MAP_HATCH_SIZE - MAP_HATCH_LINE}px ${MAP_HATCH_SIZE}px)`,
}
export const mapCaptionStyle: CSSProperties = {
    padding: MAP_CAPTION_PADDING,
    borderRadius: MAP_CAPTION_RADIUS,
    background: "var(--sphere-color-content)",
    color: "var(--sphere-color-label-secondary)",
    fontSize: MAP_CAPTION_SIZE,
}
export const inspectorStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: PANE_PADDING,
    padding: PANE_PADDING,
}
export const mapAreaStyle: CSSProperties = { position: "relative", width: "100%", height: "100%" }
export const SIDEBAR_COLUMN_WIDTH = 300
export const sidebarColumnStyle: CSSProperties = { width: SIDEBAR_COLUMN_WIDTH, height: WINDOW_HEIGHT }
export const inspectorFrameStyle: CSSProperties = {
    width: SIDEBAR_COLUMN_WIDTH,
    background: "var(--sphere-color-sidebar)",
    border: "1px solid var(--sphere-color-separator)",
}
export const propertiesWindowStyle: CSSProperties = { ...windowFrameStyle, display: "flex", flexDirection: "column" }

// States sheets: one captioned cell per state, side by side.
export const STATE_SHEET_GAP = 24
export const STATE_CELL_GAP = 8
export const stateSheetStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: STATE_SHEET_GAP,
    padding: GALLERY_PADDING,
}
export const stateCellStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: STATE_CELL_GAP,
}
export const stateCaptionStyle: CSSProperties = {
    color: "var(--sphere-color-label-secondary)",
    fontSize: "var(--sphere-font-size-mini)",
}
export const stateSheetsStyle: CSSProperties = { display: "flex", flexDirection: "column" }

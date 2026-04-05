export type MapTool = "navigation" | "select" | "info"

export const DEFAULT_MAP_TOOL: MapTool = "navigation"

const SELECTION_TOOLS = new Set<MapTool>(["select", "info"])
const HOVER_POPUP_TOOLS = new Set<MapTool>(["info"])
const POPUP_VISIBLE_TOOLS = new Set<MapTool>(["info"])

export function isClickSelectEnabled(tool: MapTool): boolean {
    return SELECTION_TOOLS.has(tool)
}

export function isRectSelectEnabled(tool: MapTool): boolean {
    return SELECTION_TOOLS.has(tool)
}

export function isHoverPopupEnabled(tool: MapTool): boolean {
    return HOVER_POPUP_TOOLS.has(tool)
}

export function isPopupVisible(tool: MapTool): boolean {
    return POPUP_VISIBLE_TOOLS.has(tool)
}

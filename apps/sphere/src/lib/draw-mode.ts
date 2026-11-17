import type { DrawTool } from "@/types"

// The draw control's modes in which it builds a new feature click by click
const MODE_DRAW_POINT = "draw_point"
const MODE_DRAW_LINE_STRING = "draw_line_string"
const MODE_DRAW_POLYGON = "draw_polygon"

/** The draw control's mode each toolbar tool starts. */
export const DRAW_TOOL_MODES: Readonly<Record<DrawTool, string>> = {
    point: MODE_DRAW_POINT,
    line: MODE_DRAW_LINE_STRING,
    polygon: MODE_DRAW_POLYGON,
}

const CREATION_MODES: ReadonlySet<string> = new Set(Object.values(DRAW_TOOL_MODES))

/** True when the draw control's mode creates a feature: its clicks place vertices, its drags belong to draw. */
export function isCreationMode(mode: string | undefined): boolean {
    return mode !== undefined && CREATION_MODES.has(mode)
}

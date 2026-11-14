// The draw control's modes in which it builds a new feature click by click
const MODE_DRAW_POINT = "draw_point"
const MODE_DRAW_LINE_STRING = "draw_line_string"
const MODE_DRAW_POLYGON = "draw_polygon"

const CREATION_MODES: ReadonlySet<string> = new Set([MODE_DRAW_POINT, MODE_DRAW_LINE_STRING, MODE_DRAW_POLYGON])

/** True when the draw control's mode creates a feature: its clicks place vertices, its drags belong to draw. */
export function isCreationMode(mode: string | undefined): boolean {
    return mode !== undefined && CREATION_MODES.has(mode)
}

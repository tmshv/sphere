import { describe, expect, test } from "vitest"
import { DRAW_TOOL_MODES, drawToolOfMode, isCreationMode } from "./draw-mode"

describe("draw modes", () => {
    test("each tool starts the control's mode that creates its kind of feature", () => {
        expect(DRAW_TOOL_MODES).toEqual({
            point: "draw_point",
            line: "draw_line_string",
            polygon: "draw_polygon",
        })
    })

    test.each([
        ["draw_point", true],
        ["draw_line_string", true],
        ["draw_polygon", true],
        ["simple_select", false],
        ["direct_select", false],
        [undefined, false],
    ])("isCreationMode(%s) is %s", (mode, expected) => {
        expect(isCreationMode(mode)).toBe(expected)
    })

    test.each([
        ["draw_point", "point"],
        ["draw_line_string", "line"],
        ["draw_polygon", "polygon"],
        ["simple_select", undefined],
        ["direct_select", undefined],
        ["static", undefined],
        [undefined, undefined],
    ])("the tool of mode %s is %s", (mode, tool) => {
        expect(drawToolOfMode(mode)).toBe(tool)
    })
})

import { describe, expect, test } from "vitest"
import {
    type MapTool,
    DEFAULT_MAP_TOOL,
    isClickSelectEnabled,
    isRectSelectEnabled,
    isHoverPopupEnabled,
    isPopupVisible,
    isMapTool,
} from "./map-tools"

describe("map-tools capability sets", () => {
    test("DEFAULT_MAP_TOOL is navigation", () => {
        expect(DEFAULT_MAP_TOOL).toBe("navigation")
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", true],
        ["info", true],
    ])("isClickSelectEnabled(%s) = %s", (tool, expected) => {
        expect(isClickSelectEnabled(tool)).toBe(expected)
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", true],
        ["info", true],
    ])("isRectSelectEnabled(%s) = %s", (tool, expected) => {
        expect(isRectSelectEnabled(tool)).toBe(expected)
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", false],
        ["info", true],
    ])("isHoverPopupEnabled(%s) = %s", (tool, expected) => {
        expect(isHoverPopupEnabled(tool)).toBe(expected)
    })

    test.each<[MapTool, boolean]>([
        ["navigation", false],
        ["select", false],
        ["info", true],
    ])("isPopupVisible(%s) = %s", (tool, expected) => {
        expect(isPopupVisible(tool)).toBe(expected)
    })
})

describe("isMapTool", () => {
    test.each([
        ["navigation", true],
        ["select", true],
        ["info", true],
        ["draw", false],
        ["", false],
    ])("isMapTool(%s) = %s", (value, expected) => {
        expect(isMapTool(value)).toBe(expected)
    })
})

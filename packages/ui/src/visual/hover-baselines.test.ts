import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SRC_DIR = join(import.meta.dirname, "..")
const SCREENSHOTS = "__screenshots__"
const TEST_FILE = "index.visual.test.tsx"
const PLATFORM = "webkit-darwin"
const THEMES = ["light", "dark"]

// A hover case renders exactly what its rest case renders, so a control that does not react to the pointer leaves
// a baseline identical to the rest one. The tooltip, the copy button that reveals on row hover and the menu highlight
// are the reactions the spec allows; their cases are not listed here.
type HoverPair = { folder: string; hover: string; rest: string }
const PAIRS: ReadonlyArray<HoverPair> = [
    { folder: "Button", hover: "Button-hover", rest: "Button-primary" },
    { folder: "SliderField", hover: "SliderField-thumb-hover", rest: "SliderField-mid" },
    { folder: "Statusbar", hover: "Statusbar-button-hover", rest: "Statusbar-buttons-states" },
    { folder: "ActionBar", hover: "ActionBar-hover", rest: "ActionBar-separator" },
    { folder: "Select", hover: "SegmentedControl-hover", rest: "SegmentedControl-first-active" },
    { folder: "ContextMenu", hover: "ContextMenu-item-hover", rest: "ContextMenu-open" },
    { folder: "Select", hover: "Select-option-hover", rest: "Select-open" },
]

function baseline(folder: string, name: string, theme: string): Buffer {
    return readFileSync(join(SRC_DIR, folder, SCREENSHOTS, TEST_FILE, `${name}-${theme}-${PLATFORM}.png`))
}

describe("hover baselines", () => {
    for (const theme of THEMES) {
        for (const { folder, hover, rest } of PAIRS) {
            it(`${hover} is byte-for-byte ${rest} (${theme})`, () => {
                expect(baseline(folder, hover, theme).equals(baseline(folder, rest, theme))).toBe(true)
            })
        }
    }
})

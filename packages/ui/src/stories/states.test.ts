import { describe, expect, it } from "vitest"
import { pinnedStateCss } from "./states"

const DECLARATIONS = "background-color: red;"

describe("pinnedStateCss", () => {
    it("copies a press rule onto the pressed attribute", () => {
        expect(pinnedStateCss([{ selectorText: ".b:active:not(:disabled)", declarations: DECLARATIONS }])).toBe(
            `.b[data-story-active]:not(:disabled) { ${DECLARATIONS} }`,
        )
    })

    it("copies a keyboard focus rule onto the focus attribute, and only the selectors that style it", () => {
        expect(pinnedStateCss([{ selectorText: ".b:focus-visible, .c", declarations: DECLARATIONS }])).toBe(
            `.b[data-story-focus-visible] { ${DECLARATIONS} }`,
        )
    })

    it("copies nothing from rules that style neither state", () => {
        expect(
            pinnedStateCss([
                { selectorText: ".b:hover", declarations: DECLARATIONS },
                { selectorText: ".b[data-active]", declarations: DECLARATIONS },
            ]),
        ).toBe("")
    })
})

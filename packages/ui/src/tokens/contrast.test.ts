import { describe, expect, it } from "vitest"
import { contrastRatio } from "./contrast"
import type { ColorScheme } from "./palette"
import { type SemanticColor, semantic } from "./semantic"

// WCAG 2 AA for body text.
const AA_TEXT = 4.5
const MAX_RATIO = 21
const MIN_RATIO = 1
const RATIO_DIGITS = 2
const WHITE = "#ffffff"
const BLACK = "#000000"
const SHORT_WHITE = "#fff"
const SHORT_BLACK = "#000"
const NOT_HEX = "rgba(0, 0, 0, 0.5)"
// #777777 on white, the classic pair just below AA.
const MID_GREY = "#777777"
const MID_GREY_ON_WHITE = 4.48

const SCHEMES: ReadonlyArray<ColorScheme> = ["light", "dark"]
const LABEL_SURFACES: ReadonlyArray<SemanticColor> = ["window", "content", "sidebar"]
const ACCENT_SURFACES: ReadonlyArray<SemanticColor> = ["accent", "selection"]

type Pair = { foreground: SemanticColor; background: SemanticColor }

function on(foreground: SemanticColor, backgrounds: ReadonlyArray<SemanticColor>): Pair[] {
    return backgrounds.map(background => ({ foreground, background }))
}

const PAIRS: ReadonlyArray<Pair> = [
    ...on("label", LABEL_SURFACES),
    ...on("label-secondary", LABEL_SURFACES),
    ...on("on-accent", ACCENT_SURFACES),
]

describe("contrastRatio", () => {
    it("is 21 for black on white and 1 for a colour on itself", () => {
        expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(MAX_RATIO, RATIO_DIGITS)
        expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(MAX_RATIO, RATIO_DIGITS)
        expect(contrastRatio(MID_GREY, MID_GREY)).toBeCloseTo(MIN_RATIO, RATIO_DIGITS)
    })

    it("matches the WCAG reference value for mid grey on white", () => {
        expect(contrastRatio(MID_GREY, WHITE)).toBeCloseTo(MID_GREY_ON_WHITE, RATIO_DIGITS)
    })

    it("reads three-digit hex", () => {
        expect(contrastRatio(SHORT_BLACK, SHORT_WHITE)).toBeCloseTo(MAX_RATIO, RATIO_DIGITS)
    })

    it("rejects anything that is not hex", () => {
        expect(() => contrastRatio(NOT_HEX, WHITE)).toThrow()
    })
})

describe("semantic text contrast", () => {
    for (const scheme of SCHEMES) {
        for (const { foreground, background } of PAIRS) {
            it(`${foreground} on ${background} meets AA in ${scheme}`, () => {
                const ratio = contrastRatio(semantic[foreground][scheme], semantic[background][scheme])
                expect(ratio).toBeGreaterThanOrEqual(AA_TEXT)
            })
        }
    }
})

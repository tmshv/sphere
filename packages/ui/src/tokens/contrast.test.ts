import { describe, expect, it } from "vitest"
import { contrastRatio } from "./contrast"
import type { ColorScheme } from "./palette"
import { type SemanticColor, semantic } from "./semantic"

// WCAG 2 AA for body text.
const AA_TEXT = 4.5
// WCAG 2.1 SC 1.4.11 for graphical objects, such as a toggled-on glyph whose colour is its only state indicator.
const AA_NON_TEXT = 3
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

// A badge is a tag of label text on its own fill.
const PAIRS: ReadonlyArray<Pair> = [
    ...on("label", [...LABEL_SURFACES, "badge"]),
    ...on("label-secondary", LABEL_SURFACES),
    ...on("on-accent", ACCENT_SURFACES),
]

// A toggled-on glyph sits on a surface, or inside a bordered button on its rest or pressed body.
const GLYPH_SURFACES: ReadonlyArray<SemanticColor> = [...LABEL_SURFACES, "control", "control-pressed"]
// The focus ring is the only sign of keyboard focus on a borderless control, so it must stand out from the surface.
// The slider track is the only sign of the range a slider covers, so it gets the full 3:1 too.
const NON_TEXT_PAIRS: ReadonlyArray<Pair> = [
    ...on("accent-glyph", GLYPH_SURFACES),
    ...on("focus-ring", LABEL_SURFACES),
    ...on("track", LABEL_SURFACES),
]

// The hairline outlines a bordered control on every surface it sits on and parts two segments on the control body.
// It is never the only sign of the control (the body, its text and the push-button shadow are), so it gets a
// documented floor below 3:1 that keeps it visible without drawing a heavy frame: the El Capitan hairline (light
// gray 4) on the light window is 1.42:1.
const CONTROL_HAIRLINE = 1.4
const HAIRLINE_PAIRS: ReadonlyArray<Pair> = on("control-border", [...LABEL_SURFACES, "control"])

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

describe("semantic non-text contrast", () => {
    for (const scheme of SCHEMES) {
        for (const { foreground, background } of NON_TEXT_PAIRS) {
            it(`${foreground} on ${background} meets 3:1 in ${scheme}`, () => {
                const ratio = contrastRatio(semantic[foreground][scheme], semantic[background][scheme])
                expect(ratio).toBeGreaterThanOrEqual(AA_NON_TEXT)
            })
        }
    }
})

describe("control hairline contrast", () => {
    for (const scheme of SCHEMES) {
        for (const { foreground, background } of HAIRLINE_PAIRS) {
            it(`${foreground} on ${background} keeps ${CONTROL_HAIRLINE}:1 in ${scheme}`, () => {
                const ratio = contrastRatio(semantic[foreground][scheme], semantic[background][scheme])
                expect(ratio).toBeGreaterThanOrEqual(CONTROL_HAIRLINE)
            })
        }
    }
})

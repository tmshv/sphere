import { describe, expect, it } from "vitest"
import { GAP_PX } from "../Layout"
import {
    controlHeight,
    duration,
    fontSize,
    legacyScales,
    legacySemantic,
    lineHeight,
    menuItemHeight,
    opacity,
    palette,
    radius,
    rowHeight,
    type SemanticColor,
    semantic,
    space,
    tokensToCss,
} from "."

const RAMP_STEPS = 13
const WHITE = "#ffffff"
const BLACK = "#000000"
const HEX = /^#[0-9a-f]{6}$/

// The roles listed in the spec's semantic colour table, plus the component roles defined by reference.
const ROLES: ReadonlyArray<SemanticColor> = [
    "window",
    "content",
    "sidebar",
    "popup",
    "popup-border",
    "tooltip",
    "tooltip-text",
    "control",
    "control-pressed",
    "control-border",
    "control-shadow",
    "separator",
    "label",
    "label-secondary",
    "label-tertiary",
    "glyph-pressed",
    "accent",
    "accent-pressed",
    "accent-glyph",
    "on-accent",
    "selection",
    "selection-inactive",
    "focus-ring",
    "danger",
    "warning",
    "ok",
    "scrim",
    "chart-bar",
    "marker-surface",
    "marker-shadow",
]

// Legacy names spelled like a new role: the new value replaces the legacy one.
const CLASHING_LEGACY_NAMES = ["accent", "separator", "focus-ring", "danger", "on-accent", "tooltip-text"]

const RULE = /^(:root|:root\[data-theme="dark"\])\{(.*)\}$/
const DECLARATION = /^--sphere-[a-z0-9]+(-[a-z0-9]+)*:\S.*$/

type Rule = { selector: string; declarations: string[] }

function rules(): Rule[] {
    return tokensToCss()
        .split("\n")
        .map(line => {
            const match = RULE.exec(line)
            return { selector: match?.at(1) ?? "", declarations: (match?.at(2) ?? "").split(";") }
        })
}

function declarationNames(rule: Rule): string[] {
    return rule.declarations.map(declaration => declaration.split(":").at(0) ?? "")
}

describe("palette", () => {
    it("has a 13-step gray ramp from white to black", () => {
        expect(palette.gray).toHaveLength(RAMP_STEPS)
        expect(palette.gray.at(0)).toBe(WHITE)
        expect(palette.gray.at(-1)).toBe(BLACK)
        for (const step of palette.gray) expect(step).toMatch(HEX)
    })

    it("has a light and a dark value for every system colour", () => {
        for (const hue of [palette.blue, palette.red, palette.orange, palette.yellow, palette.green]) {
            expect(hue.light).toMatch(HEX)
            expect(hue.dark).toMatch(HEX)
        }
    })

    it("tunes the light theme to El Capitan and the dark theme to macOS dark", () => {
        expect(semantic.window).toEqual({ light: "#ececec", dark: "#323232" })
        expect(semantic.content).toEqual({ light: WHITE, dark: "#1e1e1e" })
    })
})

describe("semantic colours", () => {
    it("defines every role", () => {
        expect(Object.keys(semantic).sort()).toEqual([...ROLES].sort())
    })

    it("gives every role a value in both schemes", () => {
        for (const value of Object.values(semantic)) {
            expect(value.light).not.toBe("")
            expect(value.dark).not.toBe("")
        }
    })

    it("defines component roles by reference", () => {
        expect(semantic["chart-bar"]).toEqual(semantic.accent)
        expect(semantic["glyph-pressed"]).toEqual(semantic.label)
        expect(semantic["tooltip-text"]).toEqual(semantic.label)
        expect(semantic["marker-surface"]).toEqual({ light: palette.gray[0], dark: palette.gray[0] })
    })

    it("drops the legacy entries whose names a new role takes", () => {
        for (const name of CLASHING_LEGACY_NAMES) expect(Object.keys(legacySemantic)).not.toContain(name)
    })
})

describe("scales", () => {
    it("match the spec", () => {
        expect(space).toEqual({ 2: 2, 4: 4, 6: 6, 8: 8, 12: 12, 16: 16, 20: 20 })
        expect(radius).toEqual({ none: 0, tooltip: 3, control: 4, popup: 5, window: 6, pill: 999 })
        expect(fontSize).toEqual({ mini: 10, small: 11, body: 12, regular: 13 })
        expect(lineHeight).toEqual({ text: 1.3, tight: 1.15 })
        expect(controlHeight).toEqual({ sm: 18, md: 22 })
        expect(rowHeight).toBe(22)
        expect(menuItemHeight).toBe(20)
        expect(duration).toEqual({ fast: 120, tooltipDelay: 700 })
        expect(opacity).toEqual({ disabled: 0.35 })
    })

    it("GAP_PX is derived from the legacy space scale until Layout migrates", () => {
        const { xxs, xs, sm, md } = legacyScales.space
        expect(GAP_PX).toEqual({ xxs, xs, sm, md })
    })
})

describe("tokensToCss", () => {
    it("emits light on :root and dark on [data-theme=dark]", () => {
        expect(rules().map(rule => rule.selector)).toEqual([":root", ':root[data-theme="dark"]'])
        const [light, dark] = rules()
        expect(light?.declarations).toContain("--sphere-color-window:#ececec")
        expect(dark?.declarations).toContain("--sphere-color-window:#323232")
    })

    it("is well formed: every declaration is a kebab-case --sphere- name with a value", () => {
        for (const rule of rules()) {
            for (const declaration of rule.declarations) expect(declaration).toMatch(DECLARATION)
        }
    })

    it("declares each name once per rule", () => {
        for (const rule of rules()) {
            const names = declarationNames(rule)
            expect(new Set(names).size).toBe(names.length)
        }
    })

    it("emits the new scales with units", () => {
        const css = tokensToCss()
        expect(css).toContain("--sphere-space-12:12px")
        expect(css).toContain("--sphere-radius-pill:999px")
        expect(css).toContain("--sphere-font-size-body:12px")
        expect(css).toContain("--sphere-line-height-text:1.3")
        expect(css).toContain("--sphere-control-height-sm:18px")
        expect(css).toContain("--sphere-control-height-md:22px")
        expect(css).toContain("--sphere-row-height:22px")
        expect(css).toContain("--sphere-menu-item-height:20px")
        expect(css).toContain("--sphere-titlebar-height:28px")
        expect(css).toContain("--sphere-duration-fast:120ms")
        expect(css).toContain("--sphere-duration-tooltip-delay:700ms")
        expect(css).toContain("--sphere-opacity-disabled:0.35")
        expect(css).toContain("--sphere-font-weight-semibold:600")
        expect(css).toContain("--sphere-z-index-modal:200")
    })

    it("keeps emitting legacy tokens, and the new value wins on a name clash", () => {
        const [light, dark] = rules()
        expect(light?.declarations).toContain("--sphere-space-sm:12px")
        expect(light?.declarations).toContain(`--sphere-color-body:${legacySemantic.body.light}`)
        expect(dark?.declarations).toContain(`--sphere-color-body:${legacySemantic.body.dark}`)
        expect(light?.declarations).toContain(`--sphere-color-accent:${semantic.accent.light}`)
        expect(dark?.declarations).toContain(`--sphere-color-accent:${semantic.accent.dark}`)
        expect(light?.declarations).toContain("--sphere-duration-normal:200ms")
    })
})

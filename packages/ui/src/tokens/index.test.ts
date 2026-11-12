import { describe, expect, it } from "vitest"
import { GAP_PX } from "../Layout"
import {
    controlHeight,
    duration,
    fontSize,
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
    "track",
    "badge",
    "chart-bar",
    "knob",
    "marker-surface",
    "marker-shadow",
    "statusbar",
    "statusbar-text",
    "statusbar-glyph",
    "statusbar-glyph-active",
    "statusbar-fill",
    "statusbar-error",
    "statusbar-field",
    "statusbar-field-text",
]

// Names the Mantine-era token set emitted. None may come back: every component reads the desktop roles and scales.
const REMOVED_NAMES = [
    "--sphere-color-body",
    "--sphere-color-chevron",
    "--sphere-color-accent-icon",
    "--sphere-space-sm",
    "--sphere-radius-sm",
    "--sphere-font-size-md",
    "--sphere-duration-normal",
]
const COLOR_PREFIX = "--sphere-color-"

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
        expect(semantic.knob).toEqual({ light: palette.gray[0], dark: palette.gray[0] })
    })
})

describe("scales", () => {
    it("match the spec", () => {
        expect(space).toEqual({ 2: 2, 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 20: 20 })
        expect(radius).toEqual({ none: 0, tooltip: 3, control: 4, popup: 5, window: 6, pill: 999 })
        expect(fontSize).toEqual({ mini: 10, small: 12, body: 12, regular: 14 })
        expect(lineHeight).toEqual({ text: 1.3, tight: 1.15 })
        expect(controlHeight).toEqual({ sm: 18, md: 30 })
        expect(rowHeight).toBe(30)
        expect(menuItemHeight).toBe(24)
        expect(duration).toEqual({ fast: 120, tooltipDelay: 700 })
        expect(opacity).toEqual({ disabled: 0.35 })
    })

    it("GAP_PX is derived from the space scale", () => {
        expect(GAP_PX).toEqual({ xxs: space[2], xs: space[4], sm: space[12], md: space[16] })
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
        expect(css).toContain("--sphere-control-height-md:30px")
        expect(css).toContain("--sphere-row-height:30px")
        expect(css).toContain("--sphere-menu-item-height:24px")
        expect(css).toContain("--sphere-titlebar-height:28px")
        expect(css).toContain("--sphere-focus-ring-width:3px")
        expect(css).toContain("--sphere-hairline:0.5px")
        expect(css).toContain("--sphere-duration-fast:120ms")
        expect(css).toContain("--sphere-duration-tooltip-delay:700ms")
        expect(css).toContain("--sphere-opacity-disabled:0.35")
        expect(css).toContain("--sphere-font-weight-semibold:600")
        expect(css).toContain("--sphere-z-index-modal:200")
    })

    it("emits exactly one colour per role in each scheme, and the dark rule holds colours only", () => {
        const [light, dark] = rules()
        const roleNames = ROLES.map(role => `${COLOR_PREFIX}${role}`).sort()
        const colorNames = (rule: Rule | undefined) =>
            (rule ? declarationNames(rule) : []).filter(name => name.startsWith(COLOR_PREFIX)).sort()
        expect(colorNames(light)).toEqual(roleNames)
        expect(colorNames(dark)).toEqual(roleNames)
        expect(dark ? declarationNames(dark).sort() : []).toEqual(roleNames)
    })

    it("no longer emits the Mantine-era tokens", () => {
        const names = rules().flatMap(declarationNames)
        for (const name of REMOVED_NAMES) expect(names).not.toContain(name)
    })
})

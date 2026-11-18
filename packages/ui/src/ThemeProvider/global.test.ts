import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const CSS = readFileSync(join(import.meta.dirname, "global.css"), "utf8")
const WHITESPACE = /\s+/g
const COMMENT = /\/\*.*?\*\//gs

// The rule body for `selector` (whitespace collapsed), or "" when the stylesheet has no such rule.
function ruleBody(selector: string): string {
    const flat = CSS.replace(WHITESPACE, " ")
    const start = flat.indexOf(`${selector} {`)
    if (start < 0) return ""
    const open = flat.indexOf("{", start)
    return flat.slice(open + 1, flat.indexOf("}", open)).trim()
}

describe("global.css", () => {
    it("puts every rule in the sphere-base layer", () => {
        const code = CSS.replace(COMMENT, "").trim()
        expect(code.startsWith("@layer sphere-base {")).toBe(true)
        expect(code.endsWith("}")).toBe(true)
    })

    it("sets body type and colours from the desktop tokens", () => {
        const body = ruleBody("body")
        expect(body).toContain(
            "font: var(--sphere-font-size-body) / var(--sphere-line-height-text) var(--sphere-font-family-sans)",
        )
        expect(body).toContain("background: var(--sphere-color-window)")
        expect(body).toContain("color: var(--sphere-color-label)")
        expect(body).toContain("margin: 0")
    })

    it("makes form controls inherit font and colour", () => {
        const controls = ruleBody("textarea")
        expect(controls).toContain("font: inherit")
        expect(controls).toContain("color: inherit")
    })

    it("gives buttons the default cursor", () => {
        expect(ruleBody("button")).toBe("cursor: default;")
    })

    it("turns every transition and animation off when reduced motion is requested", () => {
        const flat = CSS.replace(WHITESPACE, " ")
        const media = flat.slice(flat.indexOf("@media (prefers-reduced-motion: reduce)"))
        expect(media).toContain("transition-duration: 0s !important")
        expect(media).toContain("animation-duration: 0s !important")
    })

    it("drops the Mantine normalize copy", () => {
        expect(CSS).not.toContain("Mantine")
        expect(CSS).not.toContain("sub,")
    })
})

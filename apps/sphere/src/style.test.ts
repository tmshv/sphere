import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const STYLE_CSS = readFileSync(join(import.meta.dirname, "style.css"), "utf8")
const RULE = /([^{}]+)\{([^}]*)\}/g
const COMMENT = /\/\*[\s\S]*?\*\//g
// The macOS title bar height; the library's --sphere-titlebar-height token has the same value.
const TITLEBAR_FALLBACK = "28px"

function rules(): Array<{ selector: string; body: string }> {
    return Array.from(STYLE_CSS.matchAll(RULE), match => ({
        selector: (match.at(1) ?? "").replace(COMMENT, "").trim(),
        body: match.at(2) ?? "",
    }))
}

function declaration(selector: string, property: string): string | undefined {
    const body = rules().find(rule => rule.selector === selector)?.body ?? ""
    const pattern = new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+);`)
    return pattern.exec(body)?.at(1)?.trim()
}

describe("app style.css", () => {
    it("leaves body type and colours to the library's global stylesheet", () => {
        const selectors = rules().map(rule => rule.selector)
        expect(selectors).not.toContain(":root")
        expect(selectors).not.toContain("button:hover")
    })

    it("sizes the drag region from the titlebar token, with a fallback for the crash screen", () => {
        expect(declaration(".title", "height")).toBe(`var(--sphere-titlebar-height, ${TITLEBAR_FALLBACK})`)
    })
})

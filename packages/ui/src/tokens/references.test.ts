import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { tokensToCss } from "./css"

const SRC_DIR = join(import.meta.dirname, "..")
const GLOBAL_CSS = join("ThemeProvider", "global.css")
const MODULE_CSS_SUFFIX = ".module.css"
const REFERENCE_PATTERN = /var\((--sphere-[a-z0-9-]+)/g
const DECLARATION_PATTERN = /(--sphere-[a-z0-9-]+):/g

function stylesheets(): string[] {
    const modules = readdirSync(SRC_DIR, { recursive: true, encoding: "utf8" }).filter(file =>
        file.endsWith(MODULE_CSS_SUFFIX),
    )
    return [...modules, GLOBAL_CSS]
}

function matches(text: string, pattern: RegExp): string[] {
    return Array.from(text.matchAll(pattern), match => match.at(1)).filter(name => name !== undefined)
}

type Reference = { file: string; name: string }

// Every `var(--sphere-…)` in the CSS with the file that uses it, so a failure names the file.
function references(): Reference[] {
    return stylesheets().flatMap(file =>
        matches(readFileSync(join(SRC_DIR, file), "utf8"), REFERENCE_PATTERN).map(name => ({ file, name })),
    )
}

describe("token references", () => {
    it("finds the global stylesheet and the CSS modules", () => {
        expect(stylesheets()).toContain(GLOBAL_CSS)
        expect(stylesheets().length).toBeGreaterThan(1)
    })

    it("every var(--sphere-…) in the CSS names a declared token", () => {
        const declared = new Set(matches(tokensToCss(), DECLARATION_PATTERN))
        const missing = references()
            .filter(reference => !declared.has(reference.name))
            .map(reference => `${reference.file}: ${reference.name}`)
        expect(missing).toEqual([])
    })

    it("token values that reference another token name a declared one", () => {
        const css = tokensToCss()
        const declared = new Set(matches(css, DECLARATION_PATTERN))
        const missing = matches(css, REFERENCE_PATTERN).filter(name => !declared.has(name))
        expect(missing).toEqual([])
    })
})

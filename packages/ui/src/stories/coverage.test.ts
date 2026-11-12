import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SRC_DIR = join(import.meta.dirname, "..")
const EXPORT_PATTERN = /^export \* from "\.\/([^"/]+)/gm
const STORIES_SUFFIX = ".stories.tsx"

// Folders exported from the barrel that have no visual surface to show in Storybook.
const EXEMPT: Record<string, string> = {
    hooks: "React hooks, no rendered output",
    selection: "Pure selection helpers, no rendered output",
    ThemeProvider: "Applied globally by the Storybook preview decorator",
}

function exportedFolders(): string[] {
    const barrel = readFileSync(join(SRC_DIR, "index.ts"), "utf8")
    const folders = Array.from(barrel.matchAll(EXPORT_PATTERN), match => match[1])
    return Array.from(new Set(folders))
}

function hasStories(folder: string): boolean {
    return readdirSync(join(SRC_DIR, folder)).some(file => file.endsWith(STORIES_SUFFIX))
}

describe("story coverage", () => {
    it("has a stories file for every exported component folder", () => {
        const missing = exportedFolders().filter(folder => !(folder in EXEMPT) && !hasStories(folder))
        expect(missing).toEqual([])
    })

    it("exempts only folders the barrel exports, so no exemption outlives its folder", () => {
        const exported = new Set(exportedFolders())
        const stale = Object.keys(EXEMPT).filter(folder => !exported.has(folder))
        expect(stale).toEqual([])
    })
})

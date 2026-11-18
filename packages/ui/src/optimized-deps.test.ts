import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { OPTIMIZED_DEPS } from "../optimized-deps"

const PACKAGE_DIR = join(import.meta.dirname, "..")
// Where the components, the stories and the icons the stories render import their dependencies.
const SOURCE_DIRS = [join(PACKAGE_DIR, "src"), join(PACKAGE_DIR, ".storybook"), join(PACKAGE_DIR, "..", "icons", "src")]
const SOURCE_FILE = /\.tsx?$/
// Screenshot folders are named after their test file, so they look like source files.
const SCREENSHOTS = "__screenshots__"
const IMPORT = /from "([^".][^"]*)"/g
const BASE_UI_ENTRY = "@base-ui/react/"
// Pre-bundled although no source file names them: a library loads them, and a second copy would break it.
const TRANSITIVE: ReadonlyArray<string> = [
    // react-arborist renders its DndProvider from react-dnd; Tree hands it its own manager.
    "react-dnd",
]

function imports(): Set<string> {
    const specifiers = SOURCE_DIRS.flatMap(dir =>
        readdirSync(dir, { recursive: true, encoding: "utf8" })
            .filter(file => SOURCE_FILE.test(file) && !file.includes(SCREENSHOTS))
            .flatMap(file => Array.from(readFileSync(join(dir, file), "utf8").matchAll(IMPORT), match => match.at(1))),
    )
    return new Set(specifiers.filter(specifier => specifier !== undefined))
}

describe("OPTIMIZED_DEPS", () => {
    it("pre-bundles every Base UI entry the package imports", () => {
        const missing = [...imports()].filter(
            specifier => specifier.startsWith(BASE_UI_ENTRY) && !OPTIMIZED_DEPS.includes(specifier),
        )
        expect(missing).toEqual([])
    })

    it("lists only dependencies something imports", () => {
        const used = imports()
        const unused = OPTIMIZED_DEPS.filter(dep => !used.has(dep) && !TRANSITIVE.includes(dep))
        expect(unused).toEqual([])
    })
})

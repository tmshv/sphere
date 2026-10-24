import { describe, expect, it } from "vitest"
import { GAP_PX } from "../Layout"
import { palette, semantic, space, tokensToCss } from "."

describe("tokens", () => {
    it("palette copies Mantine 5 shades verbatim", () => {
        expect(palette.blue[6]).toBe("#228be6")
        expect(palette.dark[7]).toBe("#1A1B1E")
    })

    it("space matches today's pixels", () => {
        expect(space).toEqual({ xxs: 2, xs: 4, sm: 12, md: 16, lg: 20, xl: 28 })
    })

    it("GAP_PX is derived from space", () => {
        expect(GAP_PX).toEqual({ xxs: space.xxs, xs: space.xs, sm: space.sm, md: space.md })
    })

    it("semantic colours resolve into the palette", () => {
        expect(semantic["accent-icon"]).toEqual({ light: palette.blue[7], dark: palette.blue[5] })
        expect(semantic.body).toEqual({ light: palette.white, dark: palette.dark[7] })
    })

    it("tokensToCss emits light on :root and dark on [data-theme=dark]", () => {
        const css = tokensToCss()
        expect(css).toContain(":root{")
        expect(css).toContain(`--sphere-color-body:${palette.white}`)
        expect(css).toContain(':root[data-theme="dark"]{')
        expect(css).toContain(`--sphere-color-body:${palette.dark[7]}`)
        expect(css).toContain("--sphere-space-sm:12px")
        expect(css).toContain("--sphere-line-height-body:1.55")
        expect(css).toContain("--sphere-font-weight-semibold:600")
        expect(css).toContain("--sphere-font-weight-bold:700")
    })
})

import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { useAccentColor } from "."
import { ThemeProvider } from "../ThemeProvider"
import { semantic } from "../tokens"

function wrapper(dark: boolean) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <ThemeProvider dark={dark}>{children}</ThemeProvider>
    }
}

describe("useAccentColor", () => {
    it("returns the accent glyph colour of the provider's scheme", () => {
        const light = renderHook(() => useAccentColor(), { wrapper: wrapper(false) })
        const dark = renderHook(() => useAccentColor(), { wrapper: wrapper(true) })
        expect(light.result.current).toBe(semantic["accent-glyph"].light)
        expect(dark.result.current).toBe(semantic["accent-glyph"].dark)
    })
})

import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { useAccentColor } from "."
import { ThemeProvider } from "../ThemeProvider"

const LIGHT_ACCENT = "#1c7ed6"
const DARK_ACCENT = "#339af0"

function wrapper(dark: boolean) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <ThemeProvider dark={dark}>{children}</ThemeProvider>
    }
}

describe("useAccentColor", () => {
    it("returns the light shade in light theme and the dark shade in dark theme", () => {
        const light = renderHook(() => useAccentColor(), { wrapper: wrapper(false) })
        const dark = renderHook(() => useAccentColor(), { wrapper: wrapper(true) })
        expect(light.result.current).toBe(LIGHT_ACCENT)
        expect(dark.result.current).toBe(DARK_ACCENT)
    })
})

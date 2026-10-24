import { fireEvent, render, renderHook, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { useAccentColor, useHotkeys } from "."
import { ThemeProvider } from "../ThemeProvider"

const LIGHT_ACCENT = "#1c7ed6"
const DARK_ACCENT = "#339af0"

function wrapper(dark: boolean) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <ThemeProvider dark={dark}>{children}</ThemeProvider>
    }
}

function HotkeyProbe({ handler }: { handler: () => void }) {
    useHotkeys([["mod+V", handler]])
    return <div>probe</div>
}

describe("useHotkeys", () => {
    it("calls the handler for mod+V", () => {
        const handler = vi.fn()
        render(<HotkeyProbe handler={handler} />)
        expect(screen.getByText("probe")).toBeDefined()
        fireEvent.keyDown(document.documentElement, { key: "v", ctrlKey: true })
        expect(handler).toHaveBeenCalledTimes(1)
    })
})

describe("useAccentColor", () => {
    it("returns the light shade in light theme and the dark shade in dark theme", () => {
        const light = renderHook(() => useAccentColor(), { wrapper: wrapper(false) })
        const dark = renderHook(() => useAccentColor(), { wrapper: wrapper(true) })
        expect(light.result.current).toBe(LIGHT_ACCENT)
        expect(dark.result.current).toBe(DARK_ACCENT)
    })
})

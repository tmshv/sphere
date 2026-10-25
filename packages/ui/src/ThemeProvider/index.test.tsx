import { render, renderHook, screen } from "@testing-library/react"
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { ThemeProvider } from "."
import { useColorScheme } from "../hooks/useColorScheme"

function ColorScheme() {
    return <span>{useColorScheme()}</span>
}

describe("ThemeProvider", () => {
    it("renders children", () => {
        render(
            <ThemeProvider dark={false}>
                <span>content</span>
            </ThemeProvider>,
        )
        expect(screen.getByText("content")).toBeInTheDocument()
    })

    it("uses the light color scheme when dark is false", () => {
        render(
            <ThemeProvider dark={false}>
                <ColorScheme />
            </ThemeProvider>,
        )
        expect(screen.getByText("light")).toBeInTheDocument()
    })

    it("uses the dark color scheme when dark is true", () => {
        render(
            <ThemeProvider dark>
                <ColorScheme />
            </ThemeProvider>,
        )
        expect(screen.getByText("dark")).toBeInTheDocument()
    })

    it("sets data-theme and color-scheme on <html> and updates on toggle", () => {
        const { rerender } = render(
            <ThemeProvider dark={false}>
                <span>content</span>
            </ThemeProvider>,
        )
        expect(document.documentElement.dataset.theme).toBe("light")
        expect(document.documentElement.style.colorScheme).toBe("light")

        rerender(
            <ThemeProvider dark>
                <span>content</span>
            </ThemeProvider>,
        )
        expect(screen.getByText("content")).toBeInTheDocument()
        expect(document.documentElement.dataset.theme).toBe("dark")
        expect(document.documentElement.style.colorScheme).toBe("dark")
    })

    it("injects the token CSS once even with several providers", () => {
        render(
            <>
                <ThemeProvider dark={false}>
                    <span>a</span>
                </ThemeProvider>
                <ThemeProvider dark>
                    <span>b</span>
                </ThemeProvider>
            </>,
        )
        const styles = document.querySelectorAll("style#sphere-tokens")
        expect(styles).toHaveLength(1)
        expect(styles[0]?.textContent).toContain("--sphere-space-sm:12px")
    })

    it("useColorScheme reports the provider's scheme", () => {
        const light = renderHook(() => useColorScheme(), {
            wrapper: ({ children }) => <ThemeProvider dark={false}>{children}</ThemeProvider>,
        })
        const dark = renderHook(() => useColorScheme(), {
            wrapper: ({ children }) => <ThemeProvider dark>{children}</ThemeProvider>,
        })
        expect(light.result.current).toBe("light")
        expect(dark.result.current).toBe("dark")
    })
})

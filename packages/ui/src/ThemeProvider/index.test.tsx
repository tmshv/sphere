import { useMantineTheme } from "@mantine/core"
import { render, screen } from "@testing-library/react"
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { ThemeProvider } from "."

function ColorScheme() {
    const theme = useMantineTheme()
    return <span>{theme.colorScheme}</span>
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
})

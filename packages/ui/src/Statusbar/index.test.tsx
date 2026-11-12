import { declaredStyle, expectDesktopInteraction, fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import { Statusbar, StatusbarBadge, StatusbarButton } from "."

const ICON = <svg aria-hidden="true" />
const TRANSPARENT = ["", "transparent"]

describe("Statusbar", () => {
    it("renders children", () => {
        render(
            <Statusbar>
                <span>v1.0.0</span>
                <span>3 sources</span>
            </Statusbar>,
        )
        expect(screen.getByText("v1.0.0")).toBeInTheDocument()
        expect(screen.getByText("3 sources")).toBeInTheDocument()
    })
})

describe("StatusbarButton", () => {
    it("is named and titled by label", () => {
        render(<StatusbarButton icon={ICON} label="Select" onClick={vi.fn()} />)
        const button = screen.getByRole("button", { name: "Select" })
        expect(button).toHaveAttribute("title", "Select")
    })

    it("sets aria-pressed from active", () => {
        render(
            <>
                <StatusbarButton icon={ICON} label="On" active onClick={vi.fn()} />
                <StatusbarButton icon={ICON} label="Off" active={false} onClick={vi.fn()} />
            </>,
        )
        expect(screen.getByRole("button", { name: "On" })).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "false")
    })

    it("calls onClick when clicked", () => {
        const onClick = vi.fn()
        render(<StatusbarButton icon={ICON} label="Go" onClick={onClick} />)
        fireEvent.click(screen.getByRole("button", { name: "Go" }))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("does not call onClick when disabled", () => {
        const onClick = vi.fn()
        render(<StatusbarButton icon={ICON} label="Go" disabled onClick={onClick} />)
        const button = screen.getByRole("button", { name: "Go" })
        expect(button).toBeDisabled()
        fireEvent.click(button)
        expect(onClick).not.toHaveBeenCalled()
    })

    it("is a small glyph button", () => {
        render(<StatusbarButton icon={ICON} label="Go" onClick={vi.fn()} />)
        const button = screen.getByRole("button", { name: "Go" })
        expect(button).toHaveAttribute("data-shape", "glyph")
        expect(button).toHaveAttribute("data-size", "sm")
    })

    it("has the desktop interaction model at rest, toggled on and disabled", () => {
        render(
            <>
                <StatusbarButton icon={ICON} label="Rest" onClick={vi.fn()} />
                <StatusbarButton icon={ICON} label="On" active onClick={vi.fn()} />
                <StatusbarButton icon={ICON} label="Off" disabled onClick={vi.fn()} />
            </>,
        )
        for (const button of screen.getAllByRole("button")) {
            expectDesktopInteraction(button)
        }
    })
})

describe("StatusbarBadge", () => {
    it("renders children", () => {
        render(<StatusbarBadge>zoom=1.000</StatusbarBadge>)
        expect(screen.getByText("zoom=1.000")).toBeInTheDocument()
    })

    it("exposes its title", () => {
        render(<StatusbarBadge title="Longitude">lng=0</StatusbarBadge>)
        expect(screen.getByTitle("Longitude")).toHaveTextContent("lng=0")
    })

    it("is the short width when short", () => {
        render(
            <StatusbarBadge width="short" title="Pitch">
                pitch=0
            </StatusbarBadge>,
        )
        expect(declaredStyle(screen.getByTitle("Pitch"), "width")).toBe("var(--statusbar-badge-width-short)")
    })

    it("is the long width when long", () => {
        render(
            <StatusbarBadge width="long" title="Lng">
                lng=0
            </StatusbarBadge>,
        )
        expect(declaredStyle(screen.getByTitle("Lng"), "width")).toBe("var(--statusbar-badge-width-long)")
    })

    it("has no fixed width by default", () => {
        render(<StatusbarBadge title="Auto">auto</StatusbarBadge>)
        expect(declaredStyle(screen.getByTitle("Auto"), "width")).toBe("auto")
    })

    it("renders the error tone as danger text with no fill", () => {
        render(<StatusbarBadge tone="error">boom</StatusbarBadge>)
        const badge = screen.getByText("boom")
        expect(declaredStyle(badge, "color")).toBe("var(--sphere-color-danger)")
        expect(TRANSPARENT).toContain(declaredStyle(badge, "background-color"))
        expect(declaredStyle(badge, "top")).toBe("")
    })

    it("shows readouts as plain tabular numbers", () => {
        render(<StatusbarBadge>zoom=1.000</StatusbarBadge>)
        const badge = screen.getByText("zoom=1.000")
        expect(declaredStyle(badge, "font-variant-numeric")).toBe("tabular-nums")
        expect(declaredStyle(badge, "background-color")).toBe("")
        expect(declaredStyle(badge, "cursor")).toBe("default")
    })
})

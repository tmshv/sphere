import { declaredStyle, expectDesktopInteraction, fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { Statusbar, StatusbarBadge, StatusbarButton } from "."

const ICON = <svg aria-hidden="true" />

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

    it("is the near-black strip in both themes", () => {
        const { container } = render(<Statusbar>v1.0.0</Statusbar>)
        const bar = container.firstElementChild
        expect(bar).not.toBeNull()
        if (bar === null) {
            return
        }
        expect(declaredStyle(bar, "background-color")).toBe("var(--sphere-color-statusbar)")
        expect(declaredStyle(bar, "color")).toBe("var(--sphere-color-statusbar-text)")
        expect(declaredStyle(bar, "height")).toBe("var(--statusbar-height)")
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

    it("recolours the glyph for the dark strip: grey at rest, yellow when on, light while pressed", () => {
        render(<StatusbarButton icon={ICON} label="Go" onClick={vi.fn()} />)
        const button = screen.getByRole("button", { name: "Go" })
        expect(declaredStyle(button, "--sphere-color-label-secondary")).toBe("var(--sphere-color-statusbar-glyph)")
        expect(declaredStyle(button, "--sphere-color-accent-glyph")).toBe("var(--sphere-color-statusbar-glyph-active)")
        expect(declaredStyle(button, "--sphere-color-glyph-pressed")).toBe("var(--sphere-color-statusbar-text)")
    })

    it("shows a toggled-on fill button as a grey body behind the grey glyph", () => {
        render(<StatusbarButton icon={ICON} label="Sidebar" active activeLook="fill" onClick={vi.fn()} />)
        const button = screen.getByRole("button", { name: "Sidebar" })
        expect(declaredStyle(button, "--button-active-fill")).toBe("var(--sphere-color-statusbar-fill)")
        expect(declaredStyle(button, "--sphere-color-accent-glyph")).toBe("var(--sphere-color-statusbar-glyph)")
    })

    it("gives an accent toggle no body", () => {
        render(<StatusbarButton icon={ICON} label="Tool" active onClick={vi.fn()} />)
        expect(declaredStyle(screen.getByRole("button", { name: "Tool" }), "--button-active-fill")).toBe("")
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

describe("StatusbarButton context menu", () => {
    it("calls onContextMenu on right click and prevents the default menu", () => {
        const onContextMenu = vi.fn()
        render(<StatusbarButton icon={ICON} label="Go" onClick={vi.fn()} onContextMenu={onContextMenu} />)
        const notPrevented = fireEvent.contextMenu(screen.getByRole("button", { name: "Go" }))
        expect(onContextMenu).toHaveBeenCalledTimes(1)
        expect(notPrevented).toBe(false)
    })

    it("does not call onContextMenu when disabled", () => {
        const onContextMenu = vi.fn()
        render(<StatusbarButton icon={ICON} label="Go" disabled onClick={vi.fn()} onContextMenu={onContextMenu} />)
        fireEvent.contextMenu(screen.getByRole("button", { name: "Go" }))
        expect(onContextMenu).not.toHaveBeenCalled()
    })

    it("forwards ref to the button", () => {
        const ref = createRef<HTMLButtonElement>()
        render(<StatusbarButton ref={ref} icon={ICON} label="Go" onClick={vi.fn()} />)
        expect(ref.current).toBe(screen.getByRole("button", { name: "Go" }))
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

    it("renders the error tone as a red pill with light text", () => {
        render(<StatusbarBadge tone="error">boom</StatusbarBadge>)
        const badge = screen.getByText("boom")
        expect(declaredStyle(badge, "background-color")).toBe("var(--sphere-color-statusbar-error)")
        expect(declaredStyle(badge, "color")).toBe("var(--sphere-color-statusbar-text)")
    })

    it("shows readouts in bold uppercase monospace on the strip colour", () => {
        render(<StatusbarBadge>zoom=1.000</StatusbarBadge>)
        const badge = screen.getByText("zoom=1.000")
        expect(declaredStyle(badge, "font-family")).toBe("var(--sphere-font-family-mono)")
        expect(declaredStyle(badge, "font-weight")).toBe("var(--sphere-font-weight-bold)")
        expect(declaredStyle(badge, "text-transform")).toBe("uppercase")
        expect(declaredStyle(badge, "background-color")).toBe("var(--sphere-color-statusbar)")
        expect(declaredStyle(badge, "cursor")).toBe("default")
    })
})

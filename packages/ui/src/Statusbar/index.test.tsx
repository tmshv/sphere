import { fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
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

    it("is 90px wide when short", () => {
        render(
            <StatusbarBadge width="short" title="Pitch">
                pitch=0
            </StatusbarBadge>,
        )
        expect(screen.getByTitle("Pitch")).toHaveStyle({ width: "90px" })
    })

    it("is 101px wide when long", () => {
        render(
            <StatusbarBadge width="long" title="Lng">
                lng=0
            </StatusbarBadge>,
        )
        expect(screen.getByTitle("Lng")).toHaveStyle({ width: "101px" })
    })

    it("has no fixed width by default", () => {
        render(<StatusbarBadge title="Auto">auto</StatusbarBadge>)
        expect(screen.getByTitle("Auto")).not.toHaveStyle({ width: "90px" })
    })

    it("renders the error tone", () => {
        render(<StatusbarBadge tone="error">boom</StatusbarBadge>)
        expect(screen.getByText("boom")).toBeInTheDocument()
    })
})

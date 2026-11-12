import { IconBulb, IconBulbOff } from "@sphere/icons"
import { describe, expect, it, vi } from "vitest"
import { declaredStyle, expectDesktopInteraction, fireEvent, render, screen } from "../test-utils"
import { IconToggle } from "./IconToggle"

const ON = { icon: <IconBulb data-testid="on-glyph" />, label: "Hide" }
const OFF = { icon: <IconBulbOff data-testid="off-glyph" />, label: "Show" }

describe("IconToggle", () => {
    it("shows the on glyph and name while on, and reports off when clicked", () => {
        const onChange = vi.fn()
        render(<IconToggle value on={ON} off={OFF} onChange={onChange} />)

        expect(screen.getByTestId("on-glyph")).toBeInTheDocument()
        fireEvent.click(screen.getByRole("button", { name: ON.label }))

        expect(onChange).toHaveBeenCalledWith(false)
    })

    it("shows the off glyph and name while off, and reports on when clicked", () => {
        const onChange = vi.fn()
        render(<IconToggle value={false} on={ON} off={OFF} onChange={onChange} />)

        expect(screen.getByTestId("off-glyph")).toBeInTheDocument()
        fireEvent.click(screen.getByRole("button", { name: OFF.label }))

        expect(onChange).toHaveBeenCalledWith(true)
    })

    it("dims the off glyph to the tertiary label colour and leaves the on glyph alone", () => {
        render(
            <>
                <IconToggle value on={ON} off={OFF} onChange={vi.fn()} />
                <IconToggle value={false} on={ON} off={OFF} onChange={vi.fn()} />
            </>,
        )
        const off = screen.getByRole("button", { name: OFF.label })
        const on = screen.getByRole("button", { name: ON.label })
        expect(declaredStyle(off, "--sphere-color-label-secondary")).toBe("var(--sphere-color-label-tertiary)")
        expect(declaredStyle(on, "--sphere-color-label-secondary")).toBe("")
    })

    it("is a glyph button, not a pressed toggle, so it never turns accent", () => {
        render(<IconToggle value on={ON} off={OFF} onChange={vi.fn()} />)
        const button = screen.getByRole("button", { name: ON.label })
        expect(button).toHaveAttribute("data-shape", "glyph")
        expect(button).not.toHaveAttribute("aria-pressed")
        expect(button).not.toHaveAttribute("data-active")
    })

    it("does not report a change while disabled", () => {
        const onChange = vi.fn()
        render(<IconToggle value on={ON} off={OFF} onChange={onChange} disabled />)
        fireEvent.click(screen.getByRole("button", { name: ON.label }))
        expect(onChange).not.toHaveBeenCalled()
    })

    it("has the desktop interaction model on and off", () => {
        render(
            <>
                <IconToggle value on={ON} off={OFF} onChange={vi.fn()} />
                <IconToggle value={false} on={ON} off={OFF} onChange={vi.fn()} />
            </>,
        )
        expectDesktopInteraction(screen.getByRole("button", { name: ON.label }))
        expectDesktopInteraction(screen.getByRole("button", { name: OFF.label }))
    })
})

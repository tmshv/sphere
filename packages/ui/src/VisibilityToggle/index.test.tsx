import { declaredStyle, expectDesktopInteraction, fireEvent, render, screen } from "../test-utils"
import { describe, expect, it, vi } from "vitest"
import { HIDE_LABEL, SHOW_LABEL, VisibilityToggle } from "."

describe("VisibilityToggle", () => {
    it("offers to hide a visible item and reports the new value", () => {
        const onChange = vi.fn()
        render(<VisibilityToggle visible onChange={onChange} />)

        fireEvent.click(screen.getByRole("button", { name: HIDE_LABEL }))

        expect(onChange).toHaveBeenCalledWith(false)
    })

    it("offers to show a hidden item and reports the new value", () => {
        const onChange = vi.fn()
        render(<VisibilityToggle visible={false} onChange={onChange} />)

        fireEvent.click(screen.getByRole("button", { name: SHOW_LABEL }))

        expect(onChange).toHaveBeenCalledWith(true)
    })

    it("has the desktop interaction model when visible and when hidden", () => {
        render(
            <>
                <VisibilityToggle visible onChange={vi.fn()} />
                <VisibilityToggle visible={false} onChange={vi.fn()} />
            </>,
        )
        expectDesktopInteraction(screen.getByRole("button", { name: HIDE_LABEL }))
        expectDesktopInteraction(screen.getByRole("button", { name: SHOW_LABEL }))
    })

    it("draws the unlit bulb in the tertiary label colour", () => {
        render(<VisibilityToggle visible={false} onChange={vi.fn()} />)
        const glyph = screen.getByRole("button", { name: SHOW_LABEL }).querySelector("svg")
        if (!glyph) {
            throw new Error("VisibilityToggle rendered no glyph")
        }
        expect(declaredStyle(glyph, "color")).toBe("var(--sphere-color-label-tertiary)")
    })
})

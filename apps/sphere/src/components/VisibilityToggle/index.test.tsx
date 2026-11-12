import { fireEvent, render, screen } from "@/test-utils"
import { describe, expect, it, vi } from "vitest"
import { HIDE_LABEL, SHOW_LABEL, VisibilityToggle } from "."

const LAYER_RED = "#ff0000"

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

    it("lights the bulb in the layer colour while visible", () => {
        render(<VisibilityToggle visible color={LAYER_RED} onChange={vi.fn()} />)

        const bulb = screen.getByRole("button", { name: HIDE_LABEL }).querySelector("svg")
        expect(bulb).toHaveAttribute("stroke", LAYER_RED)
    })
})

import { fireEvent, render, screen } from "../test-utils"
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
})

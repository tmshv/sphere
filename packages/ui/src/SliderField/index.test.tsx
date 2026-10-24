import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { SliderField } from "."

describe("SliderField", () => {
    it("is labelled and exposes min, max and value", () => {
        render(<SliderField label="Radius" value={5} min={1} max={10} onChange={vi.fn()} />)

        expect(screen.getByText("Radius")).toBeInTheDocument()
        const slider = screen.getByRole("slider")
        expect(slider).toHaveAttribute("aria-valuemin", "1")
        expect(slider).toHaveAttribute("aria-valuemax", "10")
        expect(slider).toHaveAttribute("aria-valuenow", "5")
    })

    it("ArrowRight reports value + step, clamped to max", () => {
        const onChange = vi.fn()
        const { rerender } = render(
            <SliderField label="Radius" value={5} min={1} max={10} step={2} onChange={onChange} />,
        )

        fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })
        expect(onChange).toHaveBeenLastCalledWith(7)

        rerender(<SliderField label="Radius" value={10} min={1} max={10} step={2} onChange={onChange} />)
        fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })
        expect(onChange).toHaveBeenLastCalledWith(10)
    })
})

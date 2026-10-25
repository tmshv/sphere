import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { SliderField } from "."

describe("SliderField", () => {
    it("is labelled and exposes min, max and value", () => {
        render(<SliderField label="Radius" value={5} min={1} max={10} onChange={vi.fn()} />)

        expect(screen.getByText("Radius")).toBeInTheDocument()
        const slider = screen.getByRole("slider")
        // Base UI renders a native range input, which carries min, max and value itself.
        expect(slider).toHaveAttribute("min", "1")
        expect(slider).toHaveAttribute("max", "10")
        expect(slider).toHaveValue("5")
    })

    it("ArrowRight reports value + step, clamped to max", () => {
        const onChange = vi.fn()
        const { rerender } = render(
            <SliderField label="Radius" value={5} min={1} max={10} step={2} onChange={onChange} />,
        )

        fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })
        expect(onChange).toHaveBeenLastCalledWith(7)

        rerender(<SliderField label="Radius" value={10} min={1} max={10} step={2} onChange={onChange} />)
        // At max there is nothing to report: Base UI stays silent where Mantine repeated the value.
        onChange.mockClear()
        fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" })
        expect(onChange).not.toHaveBeenCalled()
    })

    it("Home and End jump to min and max", () => {
        const onChange = vi.fn()
        render(<SliderField label="Radius" value={5} min={1} max={10} onChange={onChange} />)

        fireEvent.keyDown(screen.getByRole("slider"), { key: "End" })
        expect(onChange).toHaveBeenLastCalledWith(10)

        fireEvent.keyDown(screen.getByRole("slider"), { key: "Home" })
        expect(onChange).toHaveBeenLastCalledWith(1)
    })
})

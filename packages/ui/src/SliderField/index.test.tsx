import { describe, expect, it, vi } from "vitest"
import { declaredStyle, fireEvent, render, screen, stateStyle } from "../test-utils"
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

    it("shows the current value as text next to the label, with no floating bubble", () => {
        render(<SliderField label="Radius" value={40} min={0} max={100} onChange={vi.fn()} />)

        const value = screen.getByText("40")
        expect(value).toBeVisible()
        expect(value.parentElement).toContainElement(screen.getByText("Radius"))
        const thumb = screen.getByRole("slider").parentElement
        expect(thumb?.textContent).toBe("")
    })

    it("has a 16px white knob, no growth on drag and the arrow cursor", () => {
        render(<SliderField label="Radius" value={40} min={0} max={100} onChange={vi.fn()} />)
        const thumb = screen.getByRole("slider").parentElement
        if (!thumb) throw new Error("thumb missing")

        expect(declaredStyle(thumb, "cursor")).toBe("default")
        expect(stateStyle(thumb, "transform", "[data-dragging]")).toBe("")
        expect(declaredStyle(thumb, "background-color")).toBe("var(--sphere-color-knob)")
    })

    it("draws the track in the track colour, which keeps 3:1 on every surface", () => {
        render(<SliderField label="Radius" value={40} min={0} max={100} onChange={vi.fn()} />)
        const track = screen.getByRole("slider").parentElement?.parentElement
        if (!track) throw new Error("track missing")

        expect(declaredStyle(track, "background-color")).toBe("var(--sphere-color-track)")
    })
})

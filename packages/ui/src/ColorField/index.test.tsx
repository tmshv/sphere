import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "../test-utils"
import { ColorField } from "."
import { hsvToHex } from "./hex"

const ARROW_RIGHT_KEY_CODE = 39
const BLUE_HUE_AFTER_STEP = 258
const HEX_PATTERN = /^#[0-9a-f]{6}$/

describe("ColorField", () => {
    it("shows the label and the current hex", () => {
        render(<ColorField label="Color" value="#ff0000" onChange={vi.fn()} />)

        expect(screen.getByText("Color")).toBeInTheDocument()
        expect(screen.getByText("#ff0000")).toBeInTheDocument()
    })

    it("reports a lowercase #rrggbb hex string when the hue changes", () => {
        const onChange = vi.fn()
        render(<ColorField label="Color" value="#ff0000" onChange={onChange} />)

        const hue = screen.getAllByRole("slider").at(-1)
        if (!hue) {
            throw new Error("hue slider not found")
        }
        fireEvent.keyDown(hue, { key: "ArrowRight", keyCode: ARROW_RIGHT_KEY_CODE })

        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith(expect.stringMatching(HEX_PATTERN))
    })

    it("resyncs the picker when the value prop changes", () => {
        const onChange = vi.fn()
        const { rerender } = render(<ColorField label="Color" value="#ff0000" onChange={onChange} />)

        rerender(<ColorField label="Color" value="#0000ff" onChange={onChange} />)
        const hue = screen.getAllByRole("slider").at(-1)
        if (!hue) {
            throw new Error("hue slider not found")
        }
        fireEvent.keyDown(hue, { key: "ArrowRight", keyCode: ARROW_RIGHT_KEY_CODE })

        // Blue is hue 240, so one 5% step (18 degrees) lands on 258, not on red's 18.
        expect(onChange).toHaveBeenCalledWith(hsvToHex({ h: BLUE_HUE_AFTER_STEP, s: 100, v: 100 }))
    })
})

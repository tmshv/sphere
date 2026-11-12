import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { declaredStyle, fireEvent, render, screen } from "../test-utils"
import { ColorField } from "."
import { hsvToHex } from "./hex"

const ARROW_RIGHT_KEY_CODE = 39
const BLUE_HUE_AFTER_STEP = 258
const HEX_PATTERN = /^#[0-9a-f]{6}$/

async function openPicker() {
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Color picker" }))
    return user
}

async function hueSlider() {
    const hue = (await screen.findAllByRole("slider")).at(-1)
    if (!hue) {
        throw new Error("hue slider not found")
    }
    return hue
}

describe("ColorField", () => {
    it("shows the label and the current hex in the hex field", () => {
        render(<ColorField label="Color" value="#ff0000" onChange={vi.fn()} />)

        expect(screen.getByText("Color")).toBeInTheDocument()
        expect(screen.getByLabelText("Color")).toHaveValue("#ff0000")
    })

    it("shows the colour in a swatch inside a bordered square frame", () => {
        render(<ColorField label="Color" value="#ff0000" onChange={vi.fn()} />)
        const well = screen.getByRole("button", { name: "Color picker" })

        expect(declaredStyle(well, "background-color")).toBe("var(--sphere-color-control)")
        expect(declaredStyle(well, "border-radius")).toBe("var(--sphere-radius-none)")
        expect(declaredStyle(well, "cursor")).toBe("default")
        expect(well.firstElementChild).toHaveStyle({ "--swatch-color": "#ff0000" })
    })

    it("opens the picker from the well in a popup surface", async () => {
        render(<ColorField label="Color" value="#ff0000" onChange={vi.fn()} />)
        expect(screen.queryAllByRole("slider")).toHaveLength(0)

        await openPicker()

        const popup = (await hueSlider()).closest("[class*='surface']")
        if (!popup) throw new Error("popup surface missing")
        expect(declaredStyle(popup, "background-color")).toBe("var(--sphere-color-popup)")
    })

    it("reports a lowercase #rrggbb hex string when the hue changes", async () => {
        const onChange = vi.fn()
        render(<ColorField label="Color" value="#ff0000" onChange={onChange} />)

        await openPicker()
        fireEvent.keyDown(await hueSlider(), { key: "ArrowRight", keyCode: ARROW_RIGHT_KEY_CODE })

        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith(expect.stringMatching(HEX_PATTERN))
    })

    it("reports a typed hex once it is complete", () => {
        const onChange = vi.fn()
        render(<ColorField label="Color" value="#ff0000" onChange={onChange} />)
        const field = screen.getByLabelText("Color")

        fireEvent.change(field, { target: { value: "#12" } })
        expect(onChange).not.toHaveBeenCalled()

        fireEvent.change(field, { target: { value: "#00ff00" } })
        expect(onChange).toHaveBeenCalledWith("#00ff00")
    })

    it("resyncs the picker when the value prop changes", async () => {
        const onChange = vi.fn()
        const { rerender } = render(<ColorField label="Color" value="#ff0000" onChange={onChange} />)

        rerender(<ColorField label="Color" value="#0000ff" onChange={onChange} />)
        await openPicker()
        fireEvent.keyDown(await hueSlider(), { key: "ArrowRight", keyCode: ARROW_RIGHT_KEY_CODE })

        // Blue is hue 240, so one 5% step (18 degrees) lands on 258, not on red's 18.
        expect(onChange).toHaveBeenCalledWith(hsvToHex({ h: BLUE_HUE_AFTER_STEP, s: 100, v: 100 }))
    })
})

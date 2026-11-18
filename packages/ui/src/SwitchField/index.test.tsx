import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "../test-utils"
import { SwitchField } from "."

describe("SwitchField", () => {
    it("exposes a labelled switch", () => {
        render(<SwitchField label="Hillshade" checked={false} onChange={vi.fn()} />)
        expect(screen.getByRole("switch", { name: "Hillshade" })).toHaveAttribute("aria-checked", "false")
    })

    it("reflects checked", () => {
        render(<SwitchField label="Hillshade" checked onChange={vi.fn()} />)
        expect(screen.getByRole("switch", { name: "Hillshade" })).toHaveAttribute("aria-checked", "true")
    })

    it("calls onChange(true) on click", async () => {
        const onChange = vi.fn()
        render(<SwitchField label="Hillshade" checked={false} onChange={onChange} />)
        await userEvent.click(screen.getByRole("switch", { name: "Hillshade" }))
        expect(onChange).toHaveBeenCalledWith(true)
    })
})

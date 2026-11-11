import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "../test-utils"
import { RadioListField } from "."

const OPTIONS = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
]

describe("RadioListField", () => {
    it("renders a row per option and marks value checked", () => {
        render(<RadioListField label="Source" value="b" options={OPTIONS} onChange={vi.fn()} />)
        expect(screen.getByText("Source")).toBeInTheDocument()
        expect(screen.getAllByRole("radio")).toHaveLength(2)
        expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "true")
        expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "false")
    })

    it("checks nothing when value is undefined", () => {
        render(<RadioListField label="Source" value={undefined} options={OPTIONS} onChange={vi.fn()} />)
        for (const radio of screen.getAllByRole("radio")) {
            expect(radio).toHaveAttribute("aria-checked", "false")
        }
    })

    it("calls onChange with the clicked option", async () => {
        const onChange = vi.fn()
        render(<RadioListField label="Source" value="a" options={OPTIONS} onChange={onChange} />)
        await userEvent.click(screen.getByRole("radio", { name: "Beta" }))
        expect(onChange).toHaveBeenCalledWith("b")
    })
})

import { fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import { Select } from "./Select"

const OPTIONS = [
    { value: "50", label: "50 per page" },
    { value: "100", label: "100 per page" },
    { value: "500", label: "500 per page" },
]

describe("Select", () => {
    it("renders an option for each value", () => {
        render(<Select value="50" options={OPTIONS} onChange={vi.fn()} />)
        const options = screen.getAllByRole("option")
        expect(options).toHaveLength(3)
        expect(options[0]).toHaveValue("50")
        expect(options[1]).toHaveValue("100")
        expect(options[2]).toHaveValue("500")
    })

    it("renders the label text for each option", () => {
        render(<Select value="50" options={OPTIONS} onChange={vi.fn()} />)
        expect(screen.getByRole("option", { name: "50 per page" })).toBeInTheDocument()
        expect(screen.getByRole("option", { name: "100 per page" })).toBeInTheDocument()
        expect(screen.getByRole("option", { name: "500 per page" })).toBeInTheDocument()
    })

    it("shows the current value as selected", () => {
        render(<Select value="100" options={OPTIONS} onChange={vi.fn()} />)
        const select = screen.getByRole("combobox")
        expect(select).toHaveValue("100")
    })

    it("calls onChange with the string value when selection changes", () => {
        const onChange = vi.fn()
        render(<Select value="50" options={OPTIONS} onChange={onChange} />)
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "500" } })
        expect(onChange).toHaveBeenCalledWith("500")
    })

    it("applies className to the select element", () => {
        render(
            <Select
                value="50"
                options={[{ value: "50", label: "50 per page" }]}
                onChange={vi.fn()}
                className="my-class"
            />,
        )
        expect(screen.getByRole("combobox")).toHaveClass("my-class")
    })
})

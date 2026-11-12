import { declaredStyle, fireEvent, render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import { StatusbarSelect } from "./StatusbarSelect"

const OPTIONS = [
    { value: "50", label: "50 per page" },
    { value: "100", label: "100 per page" },
    { value: "500", label: "500 per page" },
]

describe("StatusbarSelect", () => {
    it("renders an option for each value", () => {
        render(<StatusbarSelect value="50" options={OPTIONS} onChange={vi.fn()} />)
        const options = screen.getAllByRole("option")
        expect(options).toHaveLength(3)
        expect(options[0]).toHaveValue("50")
        expect(options[1]).toHaveValue("100")
        expect(options[2]).toHaveValue("500")
    })

    it("renders the label text for each option", () => {
        render(<StatusbarSelect value="50" options={OPTIONS} onChange={vi.fn()} />)
        expect(screen.getByRole("option", { name: "50 per page" })).toBeInTheDocument()
        expect(screen.getByRole("option", { name: "100 per page" })).toBeInTheDocument()
        expect(screen.getByRole("option", { name: "500 per page" })).toBeInTheDocument()
    })

    it("shows the current value as selected", () => {
        render(<StatusbarSelect value="100" options={OPTIONS} onChange={vi.fn()} />)
        const select = screen.getByRole("combobox")
        expect(select).toHaveValue("100")
    })

    it("calls onChange with the string value when selection changes", () => {
        const onChange = vi.fn()
        render(<StatusbarSelect value="50" options={OPTIONS} onChange={onChange} />)
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "500" } })
        expect(onChange).toHaveBeenCalledWith("500")
    })

    it("applies className to the select element", () => {
        render(
            <StatusbarSelect
                value="50"
                options={[{ value: "50", label: "50 per page" }]}
                onChange={vi.fn()}
                className="my-class"
            />,
        )
        expect(screen.getByRole("combobox")).toHaveClass("my-class")
    })

    it("shows the selected label and a chevron beside it", () => {
        const { container } = render(<StatusbarSelect value="100" options={OPTIONS} onChange={vi.fn()} />)
        expect(screen.getByText("100 per page", { selector: "span" })).toBeInTheDocument()
        expect(container.querySelector("svg")).not.toBeNull()
    })

    it("is a light pill with bold uppercase monospace text", () => {
        render(<StatusbarSelect value="50" options={OPTIONS} onChange={vi.fn()} />)
        const pill = screen.getByText("50 per page", { selector: "span" }).parentElement
        expect(pill).not.toBeNull()
        if (pill === null) {
            return
        }
        expect(declaredStyle(pill, "background-color")).toBe("var(--sphere-color-statusbar-field)")
        expect(declaredStyle(pill, "color")).toBe("var(--sphere-color-statusbar-field-text)")
        expect(declaredStyle(pill, "font-family")).toBe("var(--sphere-font-family-mono)")
        expect(declaredStyle(pill, "text-transform")).toBe("uppercase")
    })

    it("lets the visible value size the control, with the native select laid transparently over it", () => {
        render(<StatusbarSelect value="50" options={OPTIONS} onChange={vi.fn()} />)
        const select = screen.getByRole("combobox")
        expect(declaredStyle(select, "opacity")).toBe("0")
        expect(declaredStyle(select, "position")).toBe("absolute")
        expect(declaredStyle(select, "cursor")).toBe("default")
    })
})

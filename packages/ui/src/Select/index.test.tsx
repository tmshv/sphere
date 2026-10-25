import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "../test-utils"
import { SegmentedControl, Select } from "."

const OPTIONS = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
]

describe("Select", () => {
    it("is labelled and shows the selected option's label", () => {
        render(<Select label="Source" value="b" options={OPTIONS} onChange={vi.fn()} />)

        expect(screen.getByLabelText("Source")).toHaveTextContent("Beta")
    })

    it("reports the picked value", async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<Select label="Source" value="a" options={OPTIONS} onChange={onChange} />)

        await user.click(screen.getByLabelText("Source"))
        await user.click(await screen.findByText("Beta"))

        expect(onChange).toHaveBeenCalledWith("b")
    })

    it("accepts plain string options", () => {
        render(<Select label="Layer" value="roads" options={["roads", "water"]} onChange={vi.fn()} />)

        expect(screen.getByLabelText("Layer")).toHaveTextContent("roads")
    })

    it("renders empty when value is not among options", () => {
        render(<Select label="Source" value="gone" options={[{ value: "a", label: "A" }]} onChange={vi.fn()} />)

        expect(screen.getByLabelText("Source")).toBeInTheDocument()
        expect(screen.getByLabelText("Source").textContent).toBe("")
        expect(screen.queryByText("A")).not.toBeInTheDocument()
        expect(screen.queryByText("gone")).not.toBeInTheDocument()
    })

    it("renders empty for a null value", () => {
        render(<Select label="Source" value={null} options={OPTIONS} onChange={vi.fn()} placeholder="Pick one" />)

        expect(screen.getByLabelText("Source")).toHaveTextContent("Pick one")
    })

    it("opens with ArrowDown and picks with Enter", async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<Select label="Source" value={null} options={OPTIONS} onChange={onChange} />)

        screen.getByLabelText("Source").focus()
        await user.keyboard("{ArrowDown}")
        expect(await screen.findByRole("option", { name: "Alpha" })).toBeInTheDocument()

        await user.keyboard("{ArrowDown}{Enter}")

        expect(onChange).toHaveBeenCalledWith("b")
    })

    it("searchable Select filters options by typed text", async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(
            <Select
                label="Column"
                value={null}
                options={["Apple", "Banana", "Cherry"]}
                onChange={onChange}
                searchable
            />,
        )

        await user.click(screen.getByLabelText("Column"))
        await user.keyboard("an")

        expect(await screen.findByRole("option", { name: "Banana" })).toBeInTheDocument()
        expect(screen.queryByRole("option", { name: "Apple" })).not.toBeInTheDocument()
        expect(screen.queryByRole("option", { name: "Cherry" })).not.toBeInTheDocument()

        await user.click(screen.getByRole("option", { name: "Banana" }))

        expect(onChange).toHaveBeenCalledWith("Banana")
    })

    it("searchable Select shows the selected option's label in the input", () => {
        render(<Select label="Column" value="b" options={OPTIONS} onChange={vi.fn()} searchable />)

        expect(screen.getByLabelText("Column")).toHaveValue("Beta")
    })
})

describe("SegmentedControl", () => {
    it("moves with arrow keys and reports the value", async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<SegmentedControl label="Mode" value="a" options={OPTIONS} onChange={onChange} />)

        screen.getByRole("radio", { name: "Alpha" }).focus()
        await user.keyboard("{ArrowRight}")

        expect(onChange).toHaveBeenCalledWith("b")
    })

    it("is a labelled group and reports the picked value", () => {
        const onChange = vi.fn()
        render(<SegmentedControl label="Mode" value="a" options={OPTIONS} onChange={onChange} />)

        expect(screen.getByRole("radiogroup", { name: "Mode" })).toBeInTheDocument()
        expect(screen.getByRole("radio", { name: "Alpha", checked: true })).toBeInTheDocument()

        fireEvent.click(screen.getByRole("radio", { name: "Beta" }))

        expect(onChange).toHaveBeenCalledWith("b")
    })
})

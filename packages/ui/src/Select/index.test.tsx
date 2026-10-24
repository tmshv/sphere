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

        expect(screen.getByLabelText("Source")).toHaveValue("Beta")
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

        expect(screen.getByLabelText("Layer")).toHaveValue("roads")
    })

    it("renders empty when value is not among options", () => {
        render(<Select label="Source" value="gone" options={[{ value: "a", label: "A" }]} onChange={vi.fn()} />)

        expect(screen.getByLabelText("Source")).toBeInTheDocument()
        expect(screen.getByLabelText("Source")).toHaveValue("")
        expect(screen.queryByText("A")).not.toBeInTheDocument()
        expect(screen.queryByText("gone")).not.toBeInTheDocument()
    })

    it("renders empty for a null value", () => {
        render(<Select label="Source" value={null} options={OPTIONS} onChange={vi.fn()} placeholder="Pick one" />)

        expect(screen.getByLabelText("Source")).toHaveValue("")
        expect(screen.getByPlaceholderText("Pick one")).toBeInTheDocument()
    })
})

describe("SegmentedControl", () => {
    it("is a labelled group and reports the picked value", () => {
        const onChange = vi.fn()
        render(<SegmentedControl label="Mode" value="a" options={OPTIONS} onChange={onChange} />)

        expect(screen.getByRole("radiogroup", { name: "Mode" })).toBeInTheDocument()
        expect(screen.getByLabelText("Alpha")).toBeChecked()

        fireEvent.click(screen.getByLabelText("Beta"))

        expect(onChange).toHaveBeenCalledWith("b")
    })
})

import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import {
    declaredStyle,
    expectDesktopInteraction,
    fireEvent,
    hoverStyle,
    pressedStyle,
    render,
    screen,
    stateStyle,
} from "../test-utils"
import { SegmentedControl, Select } from "."

// An undeclared radius, or an explicit zero.
const SQUARE_CORNERS = ["", "0", "0px"]

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

    it("marks the current option with a check glyph and no other", async () => {
        const user = userEvent.setup()
        render(<Select label="Source" value="b" options={OPTIONS} onChange={vi.fn()} />)

        await user.click(screen.getByLabelText("Source"))

        const current = await screen.findByRole("option", { name: "Beta" })
        expect(current.querySelector("svg")).not.toBeNull()
        expect(screen.getByRole("option", { name: "Alpha" }).querySelector("svg")).toBeNull()
    })

    it("searchable Select marks the current option with a check glyph", async () => {
        const user = userEvent.setup()
        render(<Select label="Column" value="b" options={OPTIONS} onChange={vi.fn()} searchable />)

        await user.click(screen.getByLabelText("Column"))
        await user.clear(screen.getByLabelText("Column"))

        const current = await screen.findByRole("option", { name: "Beta" })
        expect(current.querySelector("svg")).not.toBeNull()
        expect(screen.getByRole("option", { name: "Alpha" }).querySelector("svg")).toBeNull()
    })

    it("is a pop-up button: the bordered control body with the desktop interaction model", () => {
        render(<Select label="Source" value="b" options={OPTIONS} onChange={vi.fn()} />)
        const trigger = screen.getByLabelText("Source")

        expect(declaredStyle(trigger, "background-color")).toBe("var(--sphere-color-control)")
        expect(declaredStyle(trigger, "border-radius")).toBe("var(--sphere-radius-control)")
        expect(declaredStyle(trigger, "height")).toBe("var(--sphere-control-height-md)")
        expectDesktopInteraction(trigger)
    })

    it("stays pressed while its menu is open", () => {
        render(<Select label="Source" value="b" options={OPTIONS} onChange={vi.fn()} />)

        expect(stateStyle(screen.getByLabelText("Source"), "background-color", "[data-popup-open]")).toBe(
            "var(--sphere-color-control-pressed)",
        )
    })

    it("shows the double chevron glyph on the trigger", () => {
        render(<Select label="Source" value="b" options={OPTIONS} onChange={vi.fn()} />)

        expect(screen.getByLabelText("Source").querySelector("svg")).not.toBeNull()
    })

    it("searchable Select edits as text: the text cursor", () => {
        render(<Select label="Column" value="b" options={OPTIONS} onChange={vi.fn()} searchable />)

        expect(declaredStyle(screen.getByLabelText("Column"), "cursor")).toBe("text")
    })

    it("highlights options edge to edge with square corners", async () => {
        const user = userEvent.setup()
        render(<Select label="Source" value={null} options={OPTIONS} onChange={vi.fn()} />)

        screen.getByLabelText("Source").focus()
        await user.keyboard("{ArrowDown}")
        const option = await screen.findByRole("option", { name: "Alpha" })

        expect(SQUARE_CORNERS).toContain(declaredStyle(option, "border-radius"))
        expect(declaredStyle(option, "cursor")).toBe("default")
        expect(hoverStyle(option, "background-color")).toBe("")
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

    it("an option with an icon is a radio named by its label and shows no label text", () => {
        render(
            <SegmentedControl
                label="Mode"
                value="a"
                options={[
                    { value: "a", label: "List", icon: <svg data-testid="list-icon" /> },
                    { value: "b", label: "Grid", icon: <svg data-testid="grid-icon" /> },
                ]}
                onChange={vi.fn()}
            />,
        )

        const radio = screen.getByRole("radio", { name: "List" })
        expect(radio).toHaveAttribute("title", "List")
        expect(screen.getByTestId("list-icon")).toBeInTheDocument()
        expect(screen.queryByText("List")).not.toBeInTheDocument()
    })

    it("segments follow the desktop interaction model with the accent selection", () => {
        render(<SegmentedControl label="Mode" value="a" options={OPTIONS} onChange={vi.fn()} />)
        const selected = screen.getByRole("radio", { name: "Alpha" })

        expectDesktopInteraction(screen.getByRole("radio", { name: "Beta" }))
        expect(declaredStyle(screen.getByRole("radio", { name: "Beta" }), "background-color")).toBe(
            "var(--sphere-color-control)",
        )
        expect(selected).toHaveAttribute("data-checked")
        expect(stateStyle(selected, "background-color", "[data-checked]")).toBe("var(--sphere-color-accent)")
        expect(stateStyle(selected, "color", "[data-checked]")).toBe("var(--sphere-color-on-accent)")
    })

    it("an unselected segment darkens to the pressed body while held; the selected one does not", () => {
        render(<SegmentedControl label="Mode" value="a" options={OPTIONS} onChange={vi.fn()} />)

        expect(pressedStyle(screen.getByRole("radio", { name: "Beta" }), "background-color")).toBe(
            "var(--sphere-color-control-pressed)",
        )
        expect(pressedStyle(screen.getByRole("radio", { name: "Alpha" }), "background-color")).toBe("")
        expect(pressedStyle(screen.getByRole("radio", { name: "Beta" }), "transform")).toBe("")
    })

    it("sm is shorter than the default md", () => {
        const { rerender } = render(<SegmentedControl label="Mode" value="a" options={OPTIONS} onChange={vi.fn()} />)
        expect(declaredStyle(screen.getByRole("radio", { name: "Alpha" }), "height")).toBe(
            "var(--sphere-control-height-md)",
        )

        rerender(<SegmentedControl label="Mode" value="a" options={OPTIONS} onChange={vi.fn()} size="sm" />)
        expect(declaredStyle(screen.getByRole("radio", { name: "Alpha" }), "height")).toBe(
            "var(--sphere-control-height-sm)",
        )
    })
})

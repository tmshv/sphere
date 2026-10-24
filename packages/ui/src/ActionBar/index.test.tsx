import { fireEvent, render, screen } from "../test-utils"
import { describe, expect, it, vi } from "vitest"
import { GAP_PX } from "../Layout"
import { ActionBar } from "."
import type { ActionBarItem } from "."

const MockIcon = ({ size }: { size?: number; color?: string }) => (
    <svg data-testid="mock-icon" width={size} height={size} />
)

function makeItem(name: string, disabled?: boolean): ActionBarItem {
    return {
        name,
        label: `Label for ${name}`,
        icon: MockIcon as unknown as ActionBarItem["icon"],
        disabled,
    }
}

describe("ActionBar", () => {
    it("renders action icon for each non-null item", () => {
        render(<ActionBar items={[makeItem("a"), makeItem("b"), makeItem("c")]} onClick={vi.fn()} />)
        const buttons = screen.getAllByRole("button")
        expect(buttons).toHaveLength(3)
    })

    it("clicking an icon calls onClick with the item name", () => {
        const onClick = vi.fn()
        render(<ActionBar items={[makeItem("save"), makeItem("delete")]} onClick={onClick} />)
        const buttons = screen.getAllByRole("button")
        fireEvent.click(buttons[0])
        expect(onClick).toHaveBeenCalledWith("save")
        fireEvent.click(buttons[1])
        expect(onClick).toHaveBeenCalledWith("delete")
    })

    it("null items render as spacers without action icon button", () => {
        render(<ActionBar items={[makeItem("a"), null, makeItem("b")]} onClick={vi.fn()} />)
        const buttons = screen.getAllByRole("button")
        expect(buttons).toHaveLength(2)
    })

    it("disabled items have disabled attribute", () => {
        render(<ActionBar items={[makeItem("action", true)]} onClick={vi.fn()} />)
        const button = screen.getByRole("button")
        expect(button).toBeDisabled()
    })

    it("names each button by its item label", () => {
        render(<ActionBar items={[makeItem("a"), makeItem("b")]} onClick={vi.fn()} />)
        expect(screen.getByRole("button", { name: "Label for a" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Label for b" })).toBeInTheDocument()
    })

    it("insets the bar when padded", () => {
        const { container } = render(<ActionBar items={[makeItem("a")]} onClick={vi.fn()} padded />)
        expect(container.firstElementChild).toHaveStyle({
            paddingLeft: `${GAP_PX.sm}px`,
            paddingRight: `${GAP_PX.sm}px`,
        })
    })
})

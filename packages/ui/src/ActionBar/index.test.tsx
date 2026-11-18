import { IconPlus } from "@sphere/icons"
import { declaredStyle, expectDesktopInteraction, fireEvent, render, screen } from "../test-utils"
import { describe, expect, it, vi } from "vitest"
import { ActionBar } from "."
import type { ActionBarItem } from "."

function makeItem(name: string, disabled?: boolean): ActionBarItem {
    return {
        name,
        label: `Label for ${name}`,
        icon: IconPlus,
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
        fireEvent.click(screen.getByRole("button", { name: "Label for save" }))
        expect(onClick).toHaveBeenCalledWith("save")
        fireEvent.click(screen.getByRole("button", { name: "Label for delete" }))
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
        const bar = container.firstElementChild
        if (!bar) {
            throw new Error("ActionBar rendered nothing")
        }
        expect(declaredStyle(bar, "padding-left")).toBe("var(--sphere-space-12)")
        expect(declaredStyle(bar, "padding-right")).toBe("var(--sphere-space-12)")
    })

    it("dims a disabled item with the shared disabled opacity", () => {
        render(<ActionBar items={[makeItem("action", true)]} onClick={vi.fn()} />)
        expect(declaredStyle(screen.getByRole("button"), "opacity")).toBe("var(--sphere-opacity-disabled)")
    })
})

describe("ActionBar desktop interaction", () => {
    it("has the desktop interaction model on every action", () => {
        render(<ActionBar items={[makeItem("a"), makeItem("b", true)]} onClick={vi.fn()} />)
        for (const button of screen.getAllByRole("button")) {
            expectDesktopInteraction(button)
        }
    })
})

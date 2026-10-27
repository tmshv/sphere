import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "../test-utils"
import { type TabItem, Tabs } from "."

const ITEMS: ReadonlyArray<TabItem> = [
    { value: "sources", label: "Sources", content: <div>sources body</div> },
    { value: "layers", label: "Layers", content: <div>layers body</div> },
    { value: "styles", label: "Styles", disabled: true, content: <div>styles body</div> },
]

function renderTabs(onChange: (value: string) => void = () => {}) {
    return render(<Tabs value={"sources"} onChange={onChange} items={ITEMS} />)
}

function Controlled() {
    const [value, setValue] = useState("sources")
    return <Tabs value={value} onChange={setValue} items={ITEMS} />
}

describe("Tabs", () => {
    it("renders a tab per item and only the active item's content", () => {
        renderTabs()

        expect(screen.getAllByRole("tab")).toHaveLength(ITEMS.length)
        expect(screen.getByRole("tab", { name: "Sources" })).toHaveAttribute("aria-selected", "true")
        expect(screen.getByText("sources body")).toBeInTheDocument()
        expect(screen.queryByText("layers body")).not.toBeInTheDocument()
    })

    it("clicking a tab reports its value", () => {
        const onChange = vi.fn()
        renderTabs(onChange)

        fireEvent.click(screen.getByRole("tab", { name: "Layers" }))

        expect(onChange).toHaveBeenCalledWith("layers")
    })

    it("disabled tab is not selectable", () => {
        const onChange = vi.fn()
        renderTabs(onChange)

        const tab = screen.getByRole("tab", { name: "Styles" })
        fireEvent.click(tab)

        expect(tab).toHaveAttribute("aria-disabled", "true")
        expect(onChange).not.toHaveBeenCalled()
    })

    it("moves focus with arrow keys and skips disabled tabs", async () => {
        const user = userEvent.setup()
        render(<Controlled />)

        await user.click(screen.getByRole("tab", { name: "Sources" }))
        await user.keyboard("{ArrowRight}")
        expect(screen.getByRole("tab", { name: "Layers" })).toHaveFocus()

        // "Styles" is disabled, so the next stop wraps back to "Sources".
        await user.keyboard("{ArrowRight}")
        expect(screen.getByRole("tab", { name: "Sources" })).toHaveFocus()
    })

    it("ArrowLeft wraps past the disabled tab, Home and End jump to the ends", async () => {
        const user = userEvent.setup()
        render(<Controlled />)

        await user.click(screen.getByRole("tab", { name: "Sources" }))
        await user.keyboard("{ArrowLeft}")
        expect(screen.getByRole("tab", { name: "Layers" })).toHaveFocus()

        await user.keyboard("{Home}")
        expect(screen.getByRole("tab", { name: "Sources" })).toHaveFocus()

        await user.keyboard("{End}")
        expect(screen.getByRole("tab", { name: "Layers" })).toHaveFocus()
    })

    it("arrows from the list itself land on the first or last enabled tab", async () => {
        render(<Controlled />)
        const list = screen.getByRole("tablist")

        list.focus()
        fireEvent.keyDown(list, { key: "ArrowRight" })
        expect(screen.getByRole("tab", { name: "Sources" })).toHaveFocus()

        list.focus()
        fireEvent.keyDown(list, { key: "ArrowLeft" })
        expect(screen.getByRole("tab", { name: "Layers" })).toHaveFocus()
    })

    it("switching tabs unmounts the previous content", () => {
        render(<Controlled />)

        fireEvent.click(screen.getByRole("tab", { name: "Layers" }))

        expect(screen.getByText("layers body")).toBeInTheDocument()
        expect(screen.queryByText("sources body")).not.toBeInTheDocument()
    })
})

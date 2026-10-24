import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
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

        expect(tab).toBeDisabled()
        expect(onChange).not.toHaveBeenCalled()
    })

    it("switching tabs unmounts the previous content", () => {
        render(<Controlled />)

        fireEvent.click(screen.getByRole("tab", { name: "Layers" }))

        expect(screen.getByText("layers body")).toBeInTheDocument()
        expect(screen.queryByText("sources body")).not.toBeInTheDocument()
    })

    it("fills the sidebar height without overflowing it", () => {
        const { container } = renderTabs()
        const root = container.firstElementChild
        if (!root) {
            throw new Error("tabs root not found")
        }
        const style = window.getComputedStyle(root)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("column")
        expect(style.height).toBe("100%")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
        expect(style.overflow).toBe("hidden")
    })

    it("gives the panel every pixel the tab list leaves over, and no more", () => {
        renderTabs()
        const panel = screen.getByText("sources body").parentElement
        if (!panel) {
            throw new Error("tabs panel not found")
        }
        const style = window.getComputedStyle(panel)

        expect(style.display).toBe("flex")
        expect(style.flexDirection).toBe("column")
        expect(Number.parseFloat(style.minHeight)).toBe(0)
        expect(style.overflow).toBe("hidden")
        expect(Number.parseFloat(style.flexBasis)).toBe(0)
        expect(style.flexGrow).toBe("1")
    })

    it("keeps panel children at full height unless they opt into flexing", () => {
        renderTabs()
        expect(window.getComputedStyle(screen.getByText("sources body")).flexShrink).toBe("0")
    })

    it("keeps the tab list at full height", () => {
        renderTabs()
        expect(window.getComputedStyle(screen.getByRole("tablist")).flexShrink).toBe("0")
    })
})

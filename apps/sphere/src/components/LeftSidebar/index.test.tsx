import { render, screen } from "@/test-utils"
import { Tabs } from "@mantine/core"
import { describe, expect, it } from "vitest"
import { StyledTabs } from "."

function renderTabs() {
    return render(
        <StyledTabs value={"sources"}>
            <Tabs.List>
                <Tabs.Tab value={"sources"}>Sources</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value={"sources"}>
                <div>panel body</div>
            </Tabs.Panel>
        </StyledTabs>,
    )
}

describe("StyledTabs", () => {
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
        const panel = screen.getByText("panel body").parentElement
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
        const body = screen.getByText("panel body")
        expect(window.getComputedStyle(body).flexShrink).toBe("0")
    })

    it("keeps the tab list at full height", () => {
        renderTabs()
        const list = screen.getByRole("tablist")
        expect(window.getComputedStyle(list).flexShrink).toBe("0")
    })
})

import { fireEvent, render, screen } from "@/test-utils"
import { act } from "react"
import { describe, expect, it } from "vitest"
import { ContextMenu } from "."

describe("ContextMenu", () => {
    it("renders its children after a contextmenu event opens the menu", () => {
        render(
            <ContextMenu>
                <div data-testid="child">hello</div>
            </ContextMenu>,
        )
        fireEvent.contextMenu(document)
        expect(screen.getByTestId("child")).toBeDefined()
    })

    it("shows the menu after a contextmenu event on document", () => {
        render(
            <ContextMenu>
                <div data-testid="menu-item">Item</div>
            </ContextMenu>,
        )
        fireEvent.contextMenu(document)
        expect(screen.getByTestId("menu-item")).toBeDefined()
    })

    it("positions the Menu.Target div at the event's clientX/clientY", async () => {
        const { container } = render(
            <ContextMenu>
                <div>Item</div>
            </ContextMenu>,
        )

        await act(async () => {
            document.dispatchEvent(
                new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 200 }),
            )
        })

        const target = container.querySelector("div[style]") as HTMLElement
        expect(target.style.left).toBe("100px")
        expect(target.style.top).toBe("200px")
    })
})

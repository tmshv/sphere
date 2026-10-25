import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "../test-utils"
import { ContextMenu, ContextMenuItem, ContextMenuLabel } from "."

describe("ContextMenu", () => {
    it("renders children when opened is true", () => {
        render(
            <ContextMenu opened={true} position={[100, 200]} onClose={vi.fn()}>
                <ContextMenuItem>Item</ContextMenuItem>
            </ContextMenu>,
        )
        expect(screen.getByRole("menuitem", { name: "Item" })).toBeInTheDocument()
    })

    it("does not render children when opened is false", () => {
        render(
            <ContextMenu opened={false} position={[100, 200]} onClose={vi.fn()}>
                <ContextMenuItem>Item</ContextMenuItem>
            </ContextMenu>,
        )
        expect(screen.queryByRole("menuitem")).toBeNull()
    })

    it("opens at the given point", async () => {
        render(
            <ContextMenu opened={true} position={[100, 200]} onClose={vi.fn()}>
                <ContextMenuItem>Item</ContextMenuItem>
            </ContextMenu>,
        )
        const positioner = screen.getByRole("menu").parentElement
        await waitFor(() => {
            expect(positioner?.style.getPropertyValue("--anchor-width")).toBe("0px")
            expect(positioner?.style.getPropertyValue("--anchor-height")).toBe("0px")
        })
        // happy-dom has no viewport, so the side flips; the offset is applied either way.
        expect(positioner?.style.transform).toMatch(/translate\((90|110)px, 200px\)/)
    })

    it("closes on Escape", async () => {
        const onClose = vi.fn()
        render(
            <ContextMenu opened={true} position={[100, 200]} onClose={onClose}>
                <ContextMenuItem>Item</ContextMenuItem>
            </ContextMenu>,
        )
        await userEvent.keyboard("{Escape}")
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes on outside click", async () => {
        const onClose = vi.fn()
        render(
            <div>
                <button type="button">outside</button>
                <ContextMenu opened={true} position={[100, 200]} onClose={onClose}>
                    <ContextMenuItem>Item</ContextMenuItem>
                </ContextMenu>
            </div>,
        )
        await userEvent.click(document.body)
        // pointerdown and mousedown both report it; a stateful parent unmounts after the first.
        expect(onClose).toHaveBeenCalled()
    })
})

function renderMenu(children: React.ReactNode, onClose = vi.fn()) {
    return render(
        <ContextMenu opened={true} position={[0, 0]} onClose={onClose}>
            {children}
        </ContextMenu>,
    )
}

describe("ContextMenuItem", () => {
    it("renders as a menuitem and calls onClick", async () => {
        const onClick = vi.fn()
        renderMenu(<ContextMenuItem onClick={onClick}>Copy</ContextMenuItem>)
        await userEvent.click(screen.getByRole("menuitem", { name: "Copy" }))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("closes the menu after a click, as Mantine did", async () => {
        const onClose = vi.fn()
        renderMenu(<ContextMenuItem>Copy</ContextMenuItem>, onClose)
        await userEvent.click(screen.getByRole("menuitem", { name: "Copy" }))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("does not call onClick when disabled", async () => {
        const onClick = vi.fn()
        renderMenu(
            <ContextMenuItem disabled onClick={onClick}>
                Copy
            </ContextMenuItem>,
        )
        const item = screen.getByRole("menuitem", { name: "Copy" })
        expect(item).toHaveAttribute("aria-disabled", "true")
        item.click()
        expect(onClick).not.toHaveBeenCalled()
    })

    it("shows its shortcut and icon", () => {
        renderMenu(
            <ContextMenuItem shortcut="⌘K" icon={<svg data-testid="icon" />}>
                Search
            </ContextMenuItem>,
        )
        expect(screen.getByText("⌘K")).toBeInTheDocument()
        expect(screen.getByTestId("icon")).toBeInTheDocument()
    })
})

describe("ContextMenuLabel", () => {
    it("renders its text", () => {
        renderMenu(<ContextMenuLabel>Map</ContextMenuLabel>)
        expect(screen.getByText("Map")).toBeInTheDocument()
    })
})

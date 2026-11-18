import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { declaredStyle, hoverStyle, render, screen, waitFor } from "../test-utils"
import { KbdShortcut } from "../Kbd"
import { ContextMenu, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "."

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
        // The top-left corner sits at the pointer: no offset on either side, so a flip in happy-dom changes nothing.
        expect(positioner?.style.transform).toBe("translate(100px, 200px)")
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
    it("shows a KbdShortcut as its shortcut", () => {
        renderMenu(<ContextMenuItem shortcut={<KbdShortcut keys={["⌘", "Z"]} />}>Zoom</ContextMenuItem>)
        const item = screen.getByRole("menuitem", { name: /Zoom/ })
        const caps = Array.from(item.querySelectorAll("kbd kbd"), cap => cap.textContent)
        expect(caps).toEqual(["⌘", "Z"])
    })

    it("insets the icon column from the menu edge and starts the label after it", () => {
        renderMenu(<ContextMenuItem icon={<svg data-testid="glyph" />}>Zoom</ContextMenuItem>)
        const item = screen.getByRole("menuitem", { name: "Zoom" })
        const surface = screen.getByRole("menu")
        const column = screen.getByTestId("glyph").parentElement
        if (!column) {
            throw new Error("icon column not found")
        }
        expect(declaredStyle(surface, "--menu-inset")).toBe("var(--sphere-space-8)")
        expect(declaredStyle(surface, "--menu-text-inset")).toBe("calc(var(--menu-inset) + var(--menu-icon-column))")
        expect(declaredStyle(item, "padding-left")).toBe("var(--menu-text-inset)")
        expect(declaredStyle(column, "left")).toBe("var(--menu-inset)")
        expect(declaredStyle(column, "width")).toBe("var(--menu-icon-column)")
    })

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

describe("ContextMenu keyboard", () => {
    it("skips a disabled item with ArrowDown and ArrowUp, as Mantine did", async () => {
        renderMenu(
            <>
                <ContextMenuItem>First</ContextMenuItem>
                <ContextMenuItem disabled>Second</ContextMenuItem>
                <ContextMenuItem>Third</ContextMenuItem>
            </>,
        )
        await userEvent.keyboard("{ArrowDown}")
        expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus()
        await userEvent.keyboard("{ArrowDown}")
        expect(screen.getByRole("menuitem", { name: "Third" })).toHaveFocus()
        await userEvent.keyboard("{ArrowUp}")
        expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus()
    })
})

describe("ContextMenuLabel", () => {
    it("renders its text", () => {
        renderMenu(<ContextMenuLabel>Map</ContextMenuLabel>)
        expect(screen.getByText("Map")).toBeInTheDocument()
    })
})

describe("ContextMenuSeparator", () => {
    it("renders a separator between items", () => {
        renderMenu(
            <>
                <ContextMenuItem>Copy</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>Delete</ContextMenuItem>
            </>,
        )
        expect(screen.getByRole("separator")).toBeInTheDocument()
    })
})

const SQUARE_CORNERS = ["", "0", "0px"]

describe("ContextMenu surface", () => {
    it("highlights an item edge to edge with square corners in the light blue selection", async () => {
        renderMenu(<ContextMenuItem>Copy</ContextMenuItem>)
        await userEvent.keyboard("{ArrowDown}")
        const item = screen.getByRole("menuitem", { name: "Copy" })
        expect(item).toHaveAttribute("data-highlighted")
        expect(SQUARE_CORNERS).toContain(declaredStyle(item, "border-radius"))
        expect(declaredStyle(item, "background-color")).toBe("var(--sphere-color-selection)")
        expect(declaredStyle(item, "color")).toBe("var(--sphere-color-label)")
    })

    it("truncates a long label with an ellipsis instead of wrapping", () => {
        renderMenu(<ContextMenuItem shortcut="⌘K">Copy</ContextMenuItem>)
        const label = screen.getByText("Copy")
        expect(declaredStyle(label, "text-overflow")).toBe("ellipsis")
        expect(declaredStyle(label, "white-space")).toBe("nowrap")
        expect(declaredStyle(screen.getByText("⌘K"), "text-overflow")).toBe("ellipsis")
    })

    it("uses the arrow cursor and no hover style", () => {
        renderMenu(<ContextMenuItem>Copy</ContextMenuItem>)
        const item = screen.getByRole("menuitem", { name: "Copy" })
        expect(declaredStyle(item, "cursor")).toBe("default")
        expect(hoverStyle(item, "background-color")).toBe("")
    })
})

import { render, screen } from "../test-utils"
import { describe, expect, it, vi } from "vitest"
import { ContextMenu, ContextMenuItem, ContextMenuLabel } from "."

describe("ContextMenu", () => {
    it("renders children when opened is true", () => {
        render(
            <ContextMenu opened={true} position={[100, 200]} onClose={vi.fn()}>
                <div data-testid="menu-item">Item</div>
            </ContextMenu>,
        )
        expect(screen.getByTestId("menu-item")).toBeDefined()
    })

    it("does not render children when opened is false", () => {
        render(
            <ContextMenu opened={false} position={[100, 200]} onClose={vi.fn()}>
                <div data-testid="menu-item">Item</div>
            </ContextMenu>,
        )
        expect(screen.queryByTestId("menu-item")).toBeNull()
    })

    it("positions the target div at the given position", () => {
        const { container } = render(
            <ContextMenu opened={true} position={[100, 200]} onClose={vi.fn()}>
                <div>Item</div>
            </ContextMenu>,
        )
        const target = container.querySelector("div[style]") as HTMLElement
        expect(target.style.left).toBe("100px")
        expect(target.style.top).toBe("200px")
    })
})

function renderMenu(children: React.ReactNode) {
    return render(
        <ContextMenu opened={true} position={[0, 0]} onClose={vi.fn()}>
            {children}
        </ContextMenu>,
    )
}

describe("ContextMenuItem", () => {
    it("renders as a menuitem and calls onClick", () => {
        const onClick = vi.fn()
        renderMenu(<ContextMenuItem onClick={onClick}>Copy</ContextMenuItem>)
        screen.getByRole("menuitem", { name: "Copy" }).click()
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("does not call onClick when disabled", () => {
        const onClick = vi.fn()
        renderMenu(
            <ContextMenuItem disabled onClick={onClick}>
                Copy
            </ContextMenuItem>,
        )
        screen.getByRole("menuitem", { name: "Copy" }).click()
        expect(onClick).not.toHaveBeenCalled()
    })

    it("shows its shortcut", () => {
        renderMenu(<ContextMenuItem shortcut="⌘K">Search</ContextMenuItem>)
        expect(screen.getByText("⌘K")).toBeDefined()
    })
})

describe("ContextMenuLabel", () => {
    it("renders its text", () => {
        renderMenu(<ContextMenuLabel>Map</ContextMenuLabel>)
        expect(screen.getByText("Map")).toBeDefined()
    })
})

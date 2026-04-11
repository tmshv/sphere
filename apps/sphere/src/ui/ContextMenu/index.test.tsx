import { render, screen } from "@/test-utils"
import { describe, expect, it, vi } from "vitest"
import { ContextMenu } from "."

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

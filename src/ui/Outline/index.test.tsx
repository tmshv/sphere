import { render, screen } from "@/test-utils"
// @vitest-environment happy-dom
import type React from "react"
import { describe, expect, it, vi } from "vitest"
import { Outline } from "."

vi.mock("react-dnd", () => ({
    DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
    useDrop: () => [{ handlerId: null }, vi.fn()],
}))

vi.mock("react-dnd-html5-backend", () => ({
    HTML5Backend: {},
}))

type TestItem = {
    id: number
    label: string
}

describe("Outline", () => {
    it("renders all items via renderItem in non-draggable mode", () => {
        const items: TestItem[] = [
            { id: 1, label: "Item One" },
            { id: 2, label: "Item Two" },
            { id: 3, label: "Item Three" },
        ]
        render(<Outline items={items} onMove={vi.fn()} renderItem={item => <div>{item.label}</div>} />)
        expect(screen.getByText("Item One")).toBeInTheDocument()
        expect(screen.getByText("Item Two")).toBeInTheDocument()
        expect(screen.getByText("Item Three")).toBeInTheDocument()
    })

    it("renders with empty items array without crashing", () => {
        const { container } = render(
            <Outline items={[] as TestItem[]} onMove={vi.fn()} renderItem={item => <div>{item.label}</div>} />,
        )
        expect(container.firstChild).not.toBeNull()
    })

    it("renders items in draggable mode (smoke test)", () => {
        const items: TestItem[] = [
            { id: 1, label: "Drag Item One" },
            { id: 2, label: "Drag Item Two" },
        ]
        render(<Outline items={items} onMove={vi.fn()} renderItem={item => <div>{item.label}</div>} draggable />)
        expect(screen.getByText("Drag Item One")).toBeInTheDocument()
        expect(screen.getByText("Drag Item Two")).toBeInTheDocument()
    })
})

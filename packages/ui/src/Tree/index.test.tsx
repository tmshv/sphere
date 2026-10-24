import { fireEvent, render, screen } from "../test-utils"
import { describe, expect, it, vi } from "vitest"
import { Tree } from "."
import type { TreeItem } from "./type"

vi.mock("./useElementSize", () => ({
    useElementSize: () => ({ ref: vi.fn(), width: 300, height: 400 }),
}))

const items: TreeItem[] = [
    {
        id: "a",
        label: "Alpha",
        extra: <button type="button">Bulb</button>,
        children: [
            { id: "a/1", label: "Alpha One" },
            { id: "a/2", label: "Alpha Two" },
        ],
    },
    { id: "b", label: "Beta" },
]

function renderTree(expandedIds: string[]) {
    const onSelect = vi.fn()
    const onToggle = vi.fn()
    const onMove = vi.fn()
    render(<Tree items={items} expandedIds={expandedIds} onSelect={onSelect} onToggle={onToggle} onMove={onMove} />)
    return { onSelect, onToggle, onMove }
}

describe("Tree", () => {
    it("renders nested labels when expanded", () => {
        renderTree(["a"])
        expect(screen.getByText("Alpha")).toBeInTheDocument()
        expect(screen.getByText("Alpha One")).toBeInTheDocument()
        expect(screen.getByText("Alpha Two")).toBeInTheDocument()
        expect(screen.getByText("Beta")).toBeInTheDocument()
    })

    it("hides children when collapsed", () => {
        renderTree([])
        expect(screen.getByText("Alpha")).toBeInTheDocument()
        expect(screen.queryByText("Alpha One")).toBeNull()
    })

    it("calls onSelect with the id of a clicked row", () => {
        const { onSelect } = renderTree([])
        fireEvent.click(screen.getByText("Beta"))
        expect(onSelect).toHaveBeenCalledWith("b")
    })

    it("calls onToggle with the new expanded state when the chevron is clicked", () => {
        const { onToggle, onSelect } = renderTree([])
        fireEvent.click(screen.getByRole("button", { name: "Expand" }))
        expect(onToggle).toHaveBeenCalledWith("a", true)
        expect(onSelect).not.toHaveBeenCalled()
        expect(screen.getByText("Alpha One")).toBeInTheDocument()
    })

    it("renders extra content and does not select when it is clicked", () => {
        const { onSelect } = renderTree([])
        fireEvent.click(screen.getByRole("button", { name: "Bulb" }))
        expect(onSelect).not.toHaveBeenCalled()
    })
})

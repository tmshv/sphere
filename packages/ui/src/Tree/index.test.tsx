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

type TreeState = {
    items?: TreeItem[]
    expandedIds: string[]
    selectedId?: string
}

function renderTree(expandedIds: string[]) {
    return renderControlled({ expandedIds })
}

function renderControlled(initial: TreeState) {
    const onSelect = vi.fn()
    const onToggle = vi.fn()
    const onMove = vi.fn()
    const element = (state: TreeState) => (
        <Tree
            items={state.items ?? items}
            expandedIds={state.expandedIds}
            selectedId={state.selectedId}
            onSelect={onSelect}
            onToggle={onToggle}
            onMove={onMove}
        />
    )
    const { rerender } = render(element(initial))
    return { onSelect, onToggle, onMove, update: (state: TreeState) => rerender(element(state)) }
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

describe("Tree controlled sync", () => {
    it("expands a branch when its id is added to expandedIds", () => {
        const { onToggle, update } = renderControlled({ expandedIds: [] })
        expect(screen.queryByText("Alpha One")).toBeNull()
        update({ expandedIds: ["a"] })
        expect(screen.getByText("Alpha One")).toBeInTheDocument()
        expect(onToggle).not.toHaveBeenCalled()
    })

    it("collapses a branch when its id is removed from expandedIds", () => {
        const { onToggle, update } = renderControlled({ expandedIds: ["a"] })
        expect(screen.getByText("Alpha One")).toBeInTheDocument()
        update({ expandedIds: [] })
        expect(screen.queryByText("Alpha One")).toBeNull()
        expect(onToggle).not.toHaveBeenCalled()
    })

    it("does not echo a selectedId change back through onSelect", () => {
        const { onSelect, update } = renderControlled({ expandedIds: [] })
        update({ expandedIds: [], selectedId: "b" })
        expect(screen.getByText("Beta").closest("[role=treeitem]")).toHaveAttribute("aria-selected", "true")
        expect(onSelect).not.toHaveBeenCalled()
    })

    it("renders a new branch collapsed when it is absent from expandedIds", () => {
        const { onToggle, update } = renderControlled({ expandedIds: [] })
        const branch: TreeItem = { id: "c", label: "Gamma", children: [{ id: "c/1", label: "Gamma One" }] }
        update({ items: [...items, branch], expandedIds: [] })
        expect(screen.getByText("Gamma")).toBeInTheDocument()
        expect(screen.queryByText("Gamma One")).toBeNull()
        expect(onToggle).not.toHaveBeenCalled()
    })

    it("keeps the selection when the empty tree background is clicked", () => {
        const { onSelect } = renderControlled({ expandedIds: [], selectedId: "b" })
        // react-arborist deselects on clicks that land on the list's outer (scroll) element itself
        const background = screen.getByText("Beta").closest("[role=treeitem]")?.parentElement?.parentElement
        if (!background) {
            throw new Error("tree list element not found")
        }
        fireEvent.click(background)
        expect(onSelect).not.toHaveBeenCalled()
        expect(screen.getByText("Beta").closest("[role=treeitem]")).toHaveAttribute("aria-selected", "true")
    })
})

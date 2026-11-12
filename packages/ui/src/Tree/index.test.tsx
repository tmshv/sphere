import {
    declaredStyle,
    expectDesktopInteraction,
    fireEvent,
    focusVisibleStyle,
    hoverStyle,
    render,
    screen,
    stateStyle,
} from "../test-utils"
import { IconMap } from "@sphere/icons"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Tree } from "."
import { VisibilityToggle } from "../VisibilityToggle"
import { EXPAND_LABEL } from "./TreeRow"
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

    it("gives the chevron the desktop interaction model", () => {
        renderTree([])
        expectDesktopInteraction(screen.getByRole("button", { name: "Expand" }))
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

    it("highlights the whole selected row, not just its label", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })
        const row = screen.getByText("Beta").closest("[data-selected]")
        expect(row).not.toBeNull()
        expect(row?.contains(screen.getByText("Beta"))).toBe(true)
        expect(screen.getByText("Alpha").closest("[data-selected]")).toBeNull()
    })

    it("does not let a row drag select the labels' text", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })
        const row = screen.getByText("Beta").closest("[data-selected]")
        if (!row) {
            throw new Error("selected row not found")
        }
        expect(window.getComputedStyle(row).userSelect).toBe("none")
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

const FOCUS_WITHIN = ":focus-within"
const LAYER_RED = "#ff0000"
const HOVER_PROPERTIES = ["background-color", "color", "box-shadow"]
const TREE_ITEM = '[role="treeitem"]'
const ROW_FOCUS_RING = "inset 0 0 0 var(--sphere-focus-ring-width) var(--sphere-color-focus-ring)"
const ON_ACCENT = "var(--sphere-color-on-accent)"
const ROW_ICON_SIZE = 16

function selectedRow(label: string): Element {
    const row = screen.getByText(label).closest("[data-selected]")
    if (!row) {
        throw new Error("selected row not found")
    }
    return row
}

describe("Tree desktop look", () => {
    it("paints a selected row in a focused tree with the selection fill and on-accent text", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })
        const row = selectedRow("Beta")

        expect(stateStyle(row, "background-color", FOCUS_WITHIN)).toBe("var(--sphere-color-selection)")
        expect(stateStyle(row, "color", FOCUS_WITHIN)).toBe("var(--sphere-color-on-accent)")
    })

    it("falls back to the inactive selection with the plain label colour when the tree is not focused", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })
        const row = selectedRow("Beta")

        expect(declaredStyle(row, "background-color")).toBe("var(--sphere-color-selection-inactive)")
        expect(declaredStyle(row, "color")).toBe("var(--sphere-color-label)")
    })

    it("leaves an explicitly coloured bulb alone in a focused tree", () => {
        const colored: TreeItem[] = [
            { id: "x", label: "Xray", extra: <VisibilityToggle visible color={LAYER_RED} onChange={vi.fn()} /> },
        ]
        renderControlled({ items: colored, expandedIds: [], selectedId: "x" })
        const bulb = selectedRow("Xray").querySelector("svg")
        if (!bulb) {
            throw new Error("bulb not found")
        }

        expect(bulb).toHaveAttribute("stroke", LAYER_RED)
        expect(stateStyle(bulb, "color", FOCUS_WITHIN)).toBe("")
        expect(stateStyle(bulb, "stroke", FOCUS_WITHIN)).toBe("")
    })

    it("recolours an uncoloured glyph on a selected row in a focused tree", () => {
        const plain: TreeItem[] = [
            { id: "x", label: "Xray", extra: <VisibilityToggle visible={false} onChange={vi.fn()} /> },
        ]
        renderControlled({ items: plain, expandedIds: [], selectedId: "x" })
        const glyph = selectedRow("Xray").querySelector("svg")
        if (!glyph) {
            throw new Error("glyph not found")
        }

        expect(stateStyle(glyph, "color", FOCUS_WITHIN)).toBe("var(--sphere-color-on-accent)")
    })

    it("has the arrow cursor and no hover look on a row", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })
        const row = selectedRow("Beta")

        expect(declaredStyle(row, "cursor")).toBe("default")
        for (const property of HOVER_PROPERTIES) {
            expect(hoverStyle(row, property), `${property} on hover`).toBe("")
        }
    })

    it("draws keyboard focus on a row as the focus ring inside it, not the browser's outline", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })
        const row = selectedRow("Beta")
        const item = row.closest(TREE_ITEM)
        if (!item) {
            throw new Error("tree item not found")
        }

        expect(declaredStyle(item, "outline-style")).toBe("none")
        expect(focusVisibleStyle(row, "box-shadow")).toBe(ROW_FOCUS_RING)
    })

    it("gives the chevron the plain shape, so its focus ring is a glow outside the small control", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })

        expect(screen.getByRole("button", { name: EXPAND_LABEL })).toHaveAttribute("data-shape", "plain")
    })

    it("recolours an explicitly coloured row icon to on-accent on a selected row in a focused tree", () => {
        const colored: TreeItem[] = [
            { id: "x", label: "Xray", icon: <IconMap size={ROW_ICON_SIZE} color={LAYER_RED} /> },
        ]
        renderControlled({ items: colored, expandedIds: [], selectedId: "x" })
        const icon = selectedRow("Xray").querySelector("svg")
        if (!icon) {
            throw new Error("row icon not found")
        }

        expect(icon).toHaveAttribute("stroke", LAYER_RED)
        expect(stateStyle(icon, "stroke", FOCUS_WITHIN)).toBe(ON_ACCENT)
        expect(stateStyle(icon, "color", FOCUS_WITHIN)).toBe(ON_ACCENT)
        expect(declaredStyle(icon, "stroke")).toBe("")
    })

    it("sets row text at the body size", () => {
        renderControlled({ expandedIds: [], selectedId: "b" })

        expect(declaredStyle(selectedRow("Beta"), "font-size")).toBe("var(--sphere-font-size-body)")
    })
})

describe("Tree keyboard focus", () => {
    it("lands on the selected row when the tree is tabbed into", async () => {
        renderControlled({ expandedIds: ["a"], selectedId: "b" })

        await userEvent.tab()

        expect(document.activeElement).toBe(screen.getByText("Beta").closest(TREE_ITEM))
    })

    it("follows a selection made outside the tree", async () => {
        const { update } = renderControlled({ expandedIds: ["a"], selectedId: "b" })
        update({ expandedIds: ["a"], selectedId: "a/2" })
        expect(document.activeElement).toBe(document.body)

        await userEvent.tab()

        expect(document.activeElement).toBe(screen.getByText("Alpha Two").closest(TREE_ITEM))
    })
})

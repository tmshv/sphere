import { makeCsvSource, makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"
import { act, fireEvent, render, screen, within } from "@/test-utils"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { HIDE_LABEL, SHOW_LABEL, type TreeItem, type TreeMove, type TreeProps } from "@sphere/ui"
import { Provider } from "react-redux"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SourcesOutline } from "."

const treeProps: { current?: TreeProps } = {}

function FakeRows({ items }: { items: TreeItem[] }) {
    return (
        <ul>
            {items.map(item => (
                <li key={item.id} data-testid={`row-${item.id}`}>
                    {item.icon}
                    <span>{item.label}</span>
                    {item.extra}
                    <FakeRows items={item.children ?? []} />
                </li>
            ))}
        </ul>
    )
}

vi.mock("@sphere/ui", async importOriginal => {
    const original = await importOriginal<typeof import("@sphere/ui")>()
    return {
        ...original,
        Tree: (props: TreeProps) => {
            treeProps.current = props
            return <FakeRows items={props.items} />
        },
    }
})

const MVT_ID = "m1"
const GEOJSON_ID = "g1"
const CSV_ID = "c1"
const FOLDER_ID = "f1"
const ROADS_NODE_ID = `${MVT_ID}/roads`

function currentTree(): TreeProps {
    const props = treeProps.current
    if (!props) {
        throw new Error("Tree was not rendered")
    }
    return props
}

type RenderOptions = {
    hiddenIds?: string[]
    selectedIds?: string[]
    extraSources?: ReturnType<typeof makeCsvSource>[]
}

function renderOutline({ extraSources = [], ...options }: RenderOptions = {}) {
    const sources = [
        makeMvtSource(MVT_ID, { name: "Tiles", sourceLayers: [{ id: "roads", name: "Roads" }] }),
        makeGeojsonSource(GEOJSON_ID, { name: "Points" }),
        ...extraSources,
    ]
    const sourceState = makeSourceState(sources, { folderIds: [FOLDER_ID], ...options })
    const dispatched: unknown[] = []
    const capture: Middleware = () => next => action => {
        dispatched.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: { source: () => sourceState },
        middleware: getDefault => getDefault().concat(capture),
    })
    render(
        <Provider store={store}>
            <SourcesOutline />
        </Provider>,
    )
    return { dispatched }
}

function row(id: string) {
    return screen.getByTestId(`row-${id}`)
}

describe("SourcesOutline", () => {
    beforeEach(() => {
        treeProps.current = undefined
    })

    it("renders the source tree with children under their parent", () => {
        renderOutline()

        expect(within(row(MVT_ID)).getByText("Roads")).toBeInTheDocument()
        expect(currentTree().items.map(item => item.label)).toEqual(["Tiles", "Points", `Folder ${FOLDER_ID}`])
    })

    it("passes the selected node and expanded ids to the tree", () => {
        renderOutline({ selectedIds: [ROADS_NODE_ID] })

        expect(currentTree().selectedId).toBe(ROADS_NODE_ID)
        expect(currentTree().expandedIds).toEqual([MVT_ID])
    })

    it("shows an icon per file type and node kind", () => {
        renderOutline({ extraSources: [makeCsvSource(CSV_ID)] })

        const hasIcon = (id: string, name: string) =>
            row(id).querySelector("svg")?.classList.contains(`tabler-icon-${name}`) ?? false
        expect(hasIcon(MVT_ID, "stack-2")).toBe(true)
        expect(hasIcon(ROADS_NODE_ID, "vector")).toBe(true)
        expect(hasIcon(GEOJSON_ID, "braces")).toBe(true)
        expect(hasIcon(CSV_ID, "table")).toBe(true)
        expect(hasIcon(FOLDER_ID, "folder")).toBe(true)
    })

    it("dispatches source/setVisible with the flipped flag when a bulb is clicked", () => {
        const { dispatched } = renderOutline({ hiddenIds: [GEOJSON_ID] })

        fireEvent.click(within(row(GEOJSON_ID)).getByRole("button", { name: SHOW_LABEL }))
        fireEvent.click(within(row(ROADS_NODE_ID)).getByRole("button", { name: HIDE_LABEL }))

        expect(dispatched).toEqual([
            { type: "source/setVisible", payload: { id: GEOJSON_ID, value: true } },
            { type: "source/setVisible", payload: { id: ROADS_NODE_ID, value: false } },
        ])
    })

    it("dispatches source/move with the tree's move", () => {
        const { dispatched } = renderOutline()
        const move: TreeMove = { ids: [GEOJSON_ID], index: 0 }

        act(() => currentTree().onMove(move))

        expect(dispatched).toEqual([{ type: "source/move", payload: move }])
    })

    it("dispatches source/select with the clicked id or nothing", () => {
        const { dispatched } = renderOutline()

        act(() => currentTree().onSelect(ROADS_NODE_ID))
        act(() => currentTree().onSelect(undefined))

        expect(dispatched).toEqual([
            { type: "source/select", payload: ROADS_NODE_ID },
            { type: "source/select", payload: undefined },
        ])
    })

    it("dispatches source/setExpanded when a branch is toggled", () => {
        const { dispatched } = renderOutline()

        act(() => currentTree().onToggle(MVT_ID, false))

        expect(dispatched).toEqual([{ type: "source/setExpanded", payload: { id: MVT_ID, value: false } }])
    })

    it("allows reordering roots and siblings but not moving a child out of its parent", () => {
        renderOutline()
        const { canDrop } = currentTree()
        if (!canDrop) {
            throw new Error("canDrop was not passed")
        }

        expect(canDrop({ ids: [GEOJSON_ID], index: 0 })).toBe(true)
        expect(canDrop({ ids: [ROADS_NODE_ID], parentId: MVT_ID, index: 0 })).toBe(true)
        expect(canDrop({ ids: [ROADS_NODE_ID], index: 0 })).toBe(false)
        expect(canDrop({ ids: [ROADS_NODE_ID], parentId: FOLDER_ID, index: 0 })).toBe(false)
    })
})

import { act, fireEvent, render, screen, within } from "@/test-utils"
import appReducer from "@/store/app"
import { type Middleware, configureStore } from "@reduxjs/toolkit"
import { HIDE_LABEL, SHOW_LABEL, type TreeItem, type TreeMove, type TreeProps } from "@sphere/ui"
import { Provider } from "react-redux"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LayersOutline } from "."

const treeProps: { current?: TreeProps } = {}

vi.mock("@sphere/ui", async importOriginal => {
    const original = await importOriginal<typeof import("@sphere/ui")>()
    return {
        ...original,
        Tree: (props: TreeProps) => {
            treeProps.current = props
            return (
                <ul>
                    {props.items.map((item: TreeItem) => (
                        <li key={item.id} data-testid={`row-${item.id}`}>
                            <span>{item.label}</span>
                            {item.extra}
                        </li>
                    ))}
                </ul>
            )
        },
    }
})

function currentTree(): TreeProps {
    const props = treeProps.current
    if (!props) {
        throw new Error("Tree was not rendered")
    }
    return props
}

const layer = (id: string, fractionIndex: number, visible = true) => ({
    id,
    name: `Layer ${id}`,
    visible,
    fractionIndex,
    color: "#ff0000",
})

function renderOutline() {
    const layerState = {
        items: { l1: layer("l1", 2), l2: layer("l2", 0, false), l3: layer("l3", 1) },
        allIds: ["l1", "l2", "l3"],
        selectedId: "l3",
    }
    const dispatched: unknown[] = []
    const capture: Middleware = () => next => action => {
        dispatched.push(action)
        return next(action)
    }
    const store = configureStore({
        reducer: { app: appReducer, layer: () => layerState },
        middleware: getDefault => getDefault().concat(capture),
    })
    render(
        <Provider store={store}>
            <LayersOutline />
        </Provider>,
    )
    return { dispatched }
}

describe("LayersOutline", () => {
    beforeEach(() => {
        treeProps.current = undefined
    })

    it("renders the layers as a flat list in outline order", () => {
        renderOutline()

        expect(currentTree().items.map(item => item.id)).toEqual(["l2", "l3", "l1"])
        expect(currentTree().items.every(item => item.children === undefined)).toBe(true)
        expect(currentTree().expandedIds).toEqual([])
    })

    it("passes the selected layer to the tree", () => {
        renderOutline()

        expect(currentTree().selectedId).toBe("l3")
    })

    it("dispatches layer/setVisible with the flipped flag when a bulb is clicked", () => {
        const { dispatched } = renderOutline()

        fireEvent.click(within(screen.getByTestId("row-l2")).getByRole("button", { name: SHOW_LABEL }))
        fireEvent.click(within(screen.getByTestId("row-l1")).getByRole("button", { name: HIDE_LABEL }))

        expect(dispatched).toEqual([
            { type: "layer/setVisible", payload: { id: "l2", value: true } },
            { type: "layer/setVisible", payload: { id: "l1", value: false } },
        ])
    })

    it("dispatches layer/move with the tree's move", () => {
        const { dispatched } = renderOutline()
        const move: TreeMove = { ids: ["l1"], index: 0 }

        act(() => currentTree().onMove(move))

        expect(dispatched).toEqual([{ type: "layer/move", payload: { ids: ["l1"], index: 0 } }])
    })

    it("dispatches layer/select with the clicked layer", () => {
        const { dispatched } = renderOutline()

        act(() => currentTree().onSelect("l1"))

        expect(dispatched).toEqual([{ type: "layer/select", payload: "l1" }])
    })

    it("only lets a layer be dropped back into the list, never into another layer", () => {
        renderOutline()
        const canDrop = currentTree().canDrop
        if (!canDrop) {
            throw new Error("canDrop was not passed")
        }

        expect(canDrop({ ids: ["l1"], index: 0 })).toBe(true)
        expect(canDrop({ ids: ["l1"], parentId: "l2", index: 0 })).toBe(false)
    })
})

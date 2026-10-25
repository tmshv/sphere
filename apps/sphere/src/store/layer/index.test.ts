import { LayerType } from "@/types"
import { describe, expect, test } from "vitest"
import { sourceSlice } from "../source"
import reducer, { layerSlice } from "./index"

const { addLayer, removeLayer, select, setVisible, setColor, setName, setType, move } = layerSlice.actions
const { items, allIds, selectSelectedId } = layerSlice.selectors

import type { RootState } from "../index"

const makeRootState = (layer: object) => ({ layer }) as unknown as RootState

const makeLayer = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    name: `Layer ${id}`,
    visible: true,
    fractionIndex: 0,
    color: "#ff0000",
    sourceId: "source-1",
    ...overrides,
})

describe("layerSlice reducer", () => {
    test("initial state", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.items).toEqual({})
        expect(state.allIds).toEqual([])
        expect(state.lastAdded).toBeUndefined()
    })

    test("addLayer adds to items and allIds", () => {
        const layer = makeLayer("l1")
        const state = reducer(undefined, addLayer(layer))
        expect(state.allIds).toContain("l1")
        expect(state.items.l1).toEqual(layer)
        expect(state.lastAdded).toBe("l1")
    })

    test("addLayer sets lastAdded to the most recently added id", () => {
        const l1 = makeLayer("l1")
        const l2 = makeLayer("l2")
        let state = reducer(undefined, addLayer(l1))
        state = reducer(state, addLayer(l2))
        expect(state.lastAdded).toBe("l2")
    })

    test("removeLayer removes from items and allIds", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, removeLayer("l1"))
        expect(state.allIds).not.toContain("l1")
        expect(state.items.l1).toBeUndefined()
    })

    test("setVisible sets visibility to false", () => {
        const layer = makeLayer("l1", { visible: true })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setVisible({ id: "l1", value: false }))
        expect(state.items.l1.visible).toBe(false)
    })

    test("setVisible sets visibility to true", () => {
        const layer = makeLayer("l1", { visible: false })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setVisible({ id: "l1", value: true }))
        expect(state.items.l1.visible).toBe(true)
    })

    test("setColor updates layer color", () => {
        const layer = makeLayer("l1", { color: "#ff0000" })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setColor({ id: "l1", color: "#00ff00" }))
        expect(state.items.l1.color).toBe("#00ff00")
    })

    test("setName updates layer name", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setName({ id: "l1", value: "New Name" }))
        expect(state.items.l1.name).toBe("New Name")
    })

    test("setType sets Point type and initializes circle defaults", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setType({ id: "l1", type: LayerType.Point }))
        expect(state.items.l1.type).toBe(LayerType.Point)
        expect(state.items.l1.circle).toBeDefined()
        expect(state.items.l1.circle?.minRadius).toBe(2)
        expect(state.items.l1.circle?.maxRadius).toBe(3)
    })

    test("setType sets Heatmap type and initializes heatmap defaults", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setType({ id: "l1", type: LayerType.Heatmap }))
        expect(state.items.l1.type).toBe(LayerType.Heatmap)
        expect(state.items.l1.heatmap).toBeDefined()
        expect(state.items.l1.heatmap?.radius).toBe(10)
        expect(state.items.l1.heatmap?.intensity).toBe(3)
    })

    test("setType sets Photo type and initializes photo defaults", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setType({ id: "l1", type: LayerType.Photo }))
        expect(state.items.l1.type).toBe(LayerType.Photo)
        expect(state.items.l1.photo).toBeDefined()
    })

    describe("move", () => {
        const threeLayers = () =>
            [
                makeLayer("l1", { fractionIndex: 0 }),
                makeLayer("l2", { fractionIndex: 1 }),
                makeLayer("l3", { fractionIndex: 2 }),
            ].reduce((state, layer) => reducer(state, addLayer(layer)), reducer(undefined, { type: "@@INIT" }))
        const order = (state: ReturnType<typeof reducer>) =>
            [...state.allIds].sort(
                (a, b) => (state.items[a]?.fractionIndex ?? 0) - (state.items[b]?.fractionIndex ?? 0),
            )

        test("moves a layer to the top of the list", () => {
            expect(order(reducer(threeLayers(), move({ ids: ["l3"], index: 0 })))).toEqual(["l3", "l1", "l2"])
        })

        test("moves a layer between two others", () => {
            expect(order(reducer(threeLayers(), move({ ids: ["l1"], index: 1 })))).toEqual(["l2", "l1", "l3"])
        })

        test("moves a layer to the bottom of the list", () => {
            expect(order(reducer(threeLayers(), move({ ids: ["l1"], index: 2 })))).toEqual(["l2", "l3", "l1"])
        })

        test("keeps every other layer's position", () => {
            const state = reducer(threeLayers(), move({ ids: ["l3"], index: 1 }))
            expect(state.items.l1?.fractionIndex).toBe(0)
            expect(state.items.l2?.fractionIndex).toBe(1)
        })

        test("ignores an empty move or an unknown layer", () => {
            const state = threeLayers()
            expect(reducer(state, move({ ids: [], index: 0 }))).toEqual(state)
            expect(reducer(state, move({ ids: ["nope"], index: 0 }))).toEqual(state)
        })
    })

    test("removeSource extra reducer clears sourceId from affected layers", () => {
        const layer = makeLayer("l1", { sourceId: "s1" })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, sourceSlice.actions.removeSource("s1"))
        expect(state.items.l1.sourceId).toBeUndefined()
    })

    test("removeSource does not affect layers with different sourceId", () => {
        const layer = makeLayer("l1", { sourceId: "s2" })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, sourceSlice.actions.removeSource("s1"))
        expect(state.items.l1.sourceId).toBe("s2")
    })

    test("select sets selectedId", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, select("l1"))
        expect(state.selectedId).toBe("l1")
    })

    test("removeLayer clears selectedId when it matches the removed layer", () => {
        const layer = makeLayer("l1")
        let state = reducer(undefined, addLayer(layer))
        state = reducer(state, select("l1"))
        state = reducer(state, removeLayer("l1"))
        expect(state.selectedId).toBeUndefined()
    })

    test("removeLayer does not clear selectedId when it does not match", () => {
        const l1 = makeLayer("l1")
        const l2 = makeLayer("l2")
        let state = reducer(undefined, addLayer(l1))
        state = reducer(state, addLayer(l2))
        state = reducer(state, select("l1"))
        state = reducer(state, removeLayer("l2"))
        expect(state.selectedId).toBe("l1")
    })
})

describe("layerSlice selectors", () => {
    test("items returns items map", () => {
        const layerState = { items: { l1: makeLayer("l1") }, allIds: ["l1"] }
        expect(items(makeRootState(layerState))).toEqual(layerState.items)
    })

    test("allIds returns id array", () => {
        const layerState = { items: {}, allIds: ["l1", "l2"] }
        expect(allIds(makeRootState(layerState))).toEqual(["l1", "l2"])
    })

    test("selectSelectedId returns undefined initially", () => {
        const layerState = { items: {}, allIds: [], selectedId: undefined }
        expect(selectSelectedId(makeRootState(layerState))).toBeUndefined()
    })

    test("selectSelectedId returns the selected id", () => {
        const layerState = { items: {}, allIds: [], selectedId: "l1" }
        expect(selectSelectedId(makeRootState(layerState))).toBe("l1")
    })
})

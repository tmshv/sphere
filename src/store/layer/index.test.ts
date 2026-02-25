import { describe, test, expect } from "vitest"
import reducer, { layerSlice } from "./index"
import { sourceSlice } from "../source"
import { LayerType } from "@/types"

const { addLayer, removeLayer, setVisible, setColor, setName, setType, setPositionBefore, setPositionAfter } = layerSlice.actions
const { items, allIds } = layerSlice.selectors

const makeRootState = (layer: object) => ({ layer } as any)

const makeLayer = (id: string, overrides: Record<string, any> = {}) => ({
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
        expect(state.items["l1"]).toEqual(layer)
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
        expect(state.items["l1"]).toBeUndefined()
    })

    test("setVisible sets visibility to false", () => {
        const layer = makeLayer("l1", { visible: true })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setVisible({ id: "l1", value: false }))
        expect(state.items["l1"].visible).toBe(false)
    })

    test("setVisible sets visibility to true", () => {
        const layer = makeLayer("l1", { visible: false })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setVisible({ id: "l1", value: true }))
        expect(state.items["l1"].visible).toBe(true)
    })

    test("setColor updates layer color", () => {
        const layer = makeLayer("l1", { color: "#ff0000" })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setColor({ id: "l1", color: "#00ff00" }))
        expect(state.items["l1"].color).toBe("#00ff00")
    })

    test("setName updates layer name", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setName({ id: "l1", value: "New Name" }))
        expect(state.items["l1"].name).toBe("New Name")
    })

    test("setType sets Point type and initializes circle defaults", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setType({ id: "l1", type: LayerType.Point }))
        expect(state.items["l1"].type).toBe(LayerType.Point)
        expect(state.items["l1"].circle).toBeDefined()
        expect(state.items["l1"].circle!.minRadius).toBe(2)
        expect(state.items["l1"].circle!.maxRadius).toBe(3)
    })

    test("setType sets Heatmap type and initializes heatmap defaults", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setType({ id: "l1", type: LayerType.Heatmap }))
        expect(state.items["l1"].type).toBe(LayerType.Heatmap)
        expect(state.items["l1"].heatmap).toBeDefined()
        expect(state.items["l1"].heatmap!.radius).toBe(10)
        expect(state.items["l1"].heatmap!.intensity).toBe(3)
    })

    test("setType sets Photo type and initializes photo defaults", () => {
        const layer = makeLayer("l1")
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, setType({ id: "l1", type: LayerType.Photo }))
        expect(state.items["l1"].type).toBe(LayerType.Photo)
        expect(state.items["l1"].photo).toBeDefined()
    })

    test("setPositionBefore sets fractionIndex below the other layer", () => {
        const l1 = makeLayer("l1", { fractionIndex: 0 })
        const l2 = makeLayer("l2", { fractionIndex: 1 })
        let state = reducer(undefined, addLayer(l1))
        state = reducer(state, addLayer(l2))
        state = reducer(state, setPositionBefore({ layerId: "l1", otherLayerId: "l2" }))
        expect(state.items["l1"].fractionIndex).toBeLessThan(state.items["l2"].fractionIndex)
    })

    test("setPositionAfter sets fractionIndex above the other layer", () => {
        const l1 = makeLayer("l1", { fractionIndex: 0 })
        const l2 = makeLayer("l2", { fractionIndex: 1 })
        let state = reducer(undefined, addLayer(l1))
        state = reducer(state, addLayer(l2))
        state = reducer(state, setPositionAfter({ layerId: "l2", otherLayerId: "l1" }))
        expect(state.items["l2"].fractionIndex).toBeGreaterThan(state.items["l1"].fractionIndex)
    })

    test("removeSource extra reducer clears sourceId from affected layers", () => {
        const layer = makeLayer("l1", { sourceId: "s1" })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, sourceSlice.actions.removeSource("s1"))
        expect(state.items["l1"].sourceId).toBeUndefined()
    })

    test("removeSource does not affect layers with different sourceId", () => {
        const layer = makeLayer("l1", { sourceId: "s2" })
        const prev = reducer(undefined, addLayer(layer))
        const state = reducer(prev, sourceSlice.actions.removeSource("s1"))
        expect(state.items["l1"].sourceId).toBe("s2")
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
})

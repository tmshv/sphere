import { describe, test, expect } from "vitest"
import { selectors, selectMapStyle, selectChangeProjectionAvailable } from "./selectors"
import { STYLE_OSM } from "@/const"

const makeRootState = (overrides: Record<string, any> = {}) => ({
    draw: { sourceId: undefined },
    projection: { value: "globe" },
    mapStyle: { value: "some-style" },
    layer: { items: {}, allIds: [] },
    ...overrides,
} as any)

describe("selectProjection", () => {
    test("returns state projection when not drawing", () => {
        const state = makeRootState({ draw: { sourceId: undefined }, projection: { value: "globe" } })
        expect(selectors.projection.projection(state)).toBe("globe")
    })

    test("returns mercator when drawing", () => {
        const state = makeRootState({ draw: { sourceId: "s1" }, projection: { value: "globe" } })
        expect(selectors.projection.projection(state)).toBe("mercator")
    })

    test("returns state projection value when not drawing and value is mercator", () => {
        const state = makeRootState({ draw: { sourceId: undefined }, projection: { value: "mercator" } })
        expect(selectors.projection.projection(state)).toBe("mercator")
    })
})

describe("selectMapStyle", () => {
    test("returns state mapStyle when not drawing", () => {
        const state = makeRootState({ draw: { sourceId: undefined }, mapStyle: { value: "custom-style" } })
        expect(selectMapStyle(state)).toBe("custom-style")
    })

    test("returns STYLE_OSM when drawing", () => {
        const state = makeRootState({ draw: { sourceId: "s1" }, mapStyle: { value: "custom-style" } })
        expect(selectMapStyle(state)).toBe(STYLE_OSM)
    })
})

describe("selectChangeProjectionAvailable", () => {
    test("returns true when not drawing", () => {
        const state = makeRootState({ draw: { sourceId: undefined } })
        expect(selectChangeProjectionAvailable(state)).toBe(true)
    })

    test("returns false when drawing", () => {
        const state = makeRootState({ draw: { sourceId: "s1" } })
        expect(selectChangeProjectionAvailable(state)).toBe(false)
    })
})

describe("visibleIds", () => {
    test("returns only ids of visible layers", () => {
        const state = makeRootState({
            layer: {
                items: {
                    l1: { id: "l1", visible: true },
                    l2: { id: "l2", visible: false },
                    l3: { id: "l3", visible: true },
                },
                allIds: ["l1", "l2", "l3"],
            },
        })
        expect(selectors.layer.visibleIds(state)).toEqual(["l1", "l3"])
    })

    test("returns empty array when no layers are visible", () => {
        const state = makeRootState({
            layer: {
                items: {
                    l1: { id: "l1", visible: false },
                },
                allIds: ["l1"],
            },
        })
        expect(selectors.layer.visibleIds(state)).toEqual([])
    })

    test("returns all ids when all layers are visible", () => {
        const state = makeRootState({
            layer: {
                items: {
                    l1: { id: "l1", visible: true },
                    l2: { id: "l2", visible: true },
                },
                allIds: ["l1", "l2"],
            },
        })
        expect(selectors.layer.visibleIds(state)).toEqual(["l1", "l2"])
    })

    test("returns empty array when no layers exist", () => {
        const state = makeRootState({
            layer: { items: {}, allIds: [] },
        })
        expect(selectors.layer.visibleIds(state)).toEqual([])
    })
})

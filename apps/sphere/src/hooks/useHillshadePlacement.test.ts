import { HILLSHADE_LAYER_ID } from "@/lib/terrain"
import { renderHook } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { describe, expect, it, vi } from "vitest"
import useHillshadePlacement from "./useHillshadePlacement"

type MockLayer = { id: string; type: string }

// A map with a mutable layer stack (bottom to top) whose moveLayer behaves like MapLibre's
function makeMap(initial: MockLayer[]) {
    let stack = [...initial]
    const listeners = new Map<string, Set<() => void>>()
    const map = {
        getLayersOrder: vi.fn(() => stack.map(({ id }) => id)),
        getLayer: vi.fn((id: string) => stack.find(layer => layer.id === id)),
        moveLayer: vi.fn((id: string, beforeId?: string) => {
            const moved = stack.filter(layer => layer.id === id)
            const rest = stack.filter(layer => layer.id !== id)
            const index = beforeId === undefined ? rest.length : rest.findIndex(layer => layer.id === beforeId)
            stack = [...rest.slice(0, index), ...moved, ...rest.slice(index)]
        }),
        on: vi.fn((type: string, listener: () => void) => {
            const ofType = listeners.get(type) ?? new Set()
            listeners.set(type, ofType.add(listener))
            return { unsubscribe: () => ofType.delete(listener) }
        }),
    }
    function setStack(layers: MockLayer[]) {
        stack = [...layers]
        for (const listener of listeners.get("styledata") ?? []) {
            listener()
        }
    }
    const order = () => stack.map(({ id }) => id)
    return { map, setStack, order, listeners }
}

function makeRef(map: ReturnType<typeof makeMap>["map"]) {
    return { getMap: () => map } as unknown as MapRef
}

const hillshade: MockLayer = { id: HILLSHADE_LAYER_ID, type: "hillshade" }
const osm: MockLayer = { id: "osm", type: "raster" }
const roads: MockLayer = { id: "roads", type: "line" }
const parks: MockLayer = { id: "parks", type: "fill" }

describe("useHillshadePlacement", () => {
    it("does nothing without a map", () => {
        renderHook(() => useHillshadePlacement(undefined))
    })

    it("moves the hillshade directly above the topmost raster", () => {
        const { map, order } = makeMap([osm, roads, hillshade])
        renderHook(() => useHillshadePlacement(makeRef(map)))

        expect(order()).toEqual(["osm", HILLSHADE_LAYER_ID, "roads"])
    })

    it("listens to style changes", () => {
        const { map } = makeMap([])
        renderHook(() => useHillshadePlacement(makeRef(map)))

        expect(map.on).toHaveBeenCalledWith("styledata", expect.any(Function))
    })

    it("does not move a hillshade that is already in place", () => {
        const { map } = makeMap([osm, hillshade, roads])
        renderHook(() => useHillshadePlacement(makeRef(map)))

        expect(map.moveLayer).not.toHaveBeenCalled()
    })

    it("restacks the hillshade when the layers are reordered", () => {
        const { map, setStack, order } = makeMap([osm, hillshade, roads, parks])
        renderHook(() => useHillshadePlacement(makeRef(map)))
        setStack([roads, hillshade, parks, osm])

        expect(order()).toEqual(["roads", "parks", "osm", HILLSHADE_LAYER_ID])
    })

    it("settles after one move", () => {
        const { map, setStack } = makeMap([osm, hillshade, roads])
        renderHook(() => useHillshadePlacement(makeRef(map)))
        setStack([osm, roads, hillshade])
        setStack(map.getLayersOrder().flatMap(id => map.getLayer(id) ?? []))

        expect(map.moveLayer).toHaveBeenCalledTimes(1)
    })

    it("goes to the bottom without a raster layer", () => {
        const { map, order } = makeMap([roads, parks, hillshade])
        renderHook(() => useHillshadePlacement(makeRef(map)))

        expect(order()).toEqual([HILLSHADE_LAYER_ID, "roads", "parks"])
    })

    it("does nothing while the hillshade layer is not on the map", () => {
        const { map } = makeMap([roads, osm])
        renderHook(() => useHillshadePlacement(makeRef(map)))

        expect(map.moveLayer).not.toHaveBeenCalled()
    })

    it("stops listening on unmount", () => {
        const { map, listeners } = makeMap([])
        const { unmount } = renderHook(() => useHillshadePlacement(makeRef(map)))
        unmount()

        expect([...listeners.values()].every(ofType => ofType.size === 0)).toBe(true)
    })
})

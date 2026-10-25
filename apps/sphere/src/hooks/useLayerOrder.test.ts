import { renderHook } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { describe, expect, it, vi } from "vitest"
import useLayerOrder from "./useLayerOrder"

function makeMockMap(order: string[]) {
    return {
        getLayersOrder: vi.fn(() => order),
        moveLayer: vi.fn(),
    }
}

function makeRef(map: ReturnType<typeof makeMockMap>) {
    return { getMap: () => map } as unknown as MapRef
}

describe("useLayerOrder", () => {
    it("does nothing without a map", () => {
        renderHook(() => useLayerOrder(undefined, ["a", "b"]))
        // no error thrown
    })

    it("does not move layers that are already in order", () => {
        const map = makeMockMap(["base", "a", "b"])
        renderHook(() => useLayerOrder(makeRef(map), ["a", "b"]))

        expect(map.moveLayer).not.toHaveBeenCalled()
    })

    it("moves each out-of-order layer below the one that belongs above it", () => {
        const map = makeMockMap(["c", "b", "a"])
        renderHook(() => useLayerOrder(makeRef(map), ["b", "a", "c"]))

        expect(map.moveLayer.mock.calls).toEqual([
            ["a", "c"],
            ["b", "a"],
        ])
    })

    it("re-applies the order when the wanted order changes", () => {
        const map = makeMockMap(["a", "b"])
        const ref = makeRef(map)
        const { rerender } = renderHook(({ ids }) => useLayerOrder(ref, ids), { initialProps: { ids: ["a", "b"] } })
        expect(map.moveLayer).not.toHaveBeenCalled()

        rerender({ ids: ["b", "a"] })

        expect(map.moveLayer.mock.calls).toEqual([["b", "a"]])
    })
})

import { renderHook } from "@testing-library/react"
import type { TerrainSpecification } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"
import { describe, expect, it, vi } from "vitest"
import useTerrain from "./useTerrain"

// A map whose terrain and sources behave like MapLibre's: setTerrain throws for a source that is not on the map
function makeMap(sourceIds: string[]) {
    const sources = new Set(sourceIds)
    const listeners = new Map<string, Set<() => void>>()
    let terrain: TerrainSpecification | null = null
    const map = {
        getSource: vi.fn((id: string) => (sources.has(id) ? { id } : undefined)),
        getTerrain: vi.fn(() => terrain),
        setTerrain: vi.fn((options: TerrainSpecification | null) => {
            if (options && !sources.has(options.source)) {
                throw new Error(`cannot load terrain, because there exists no source with ID: ${options.source}`)
            }
            terrain = options
        }),
        on: vi.fn((type: string, listener: () => void) => {
            const ofType = listeners.get(type) ?? new Set()
            listeners.set(type, ofType.add(listener))
            return { unsubscribe: () => ofType.delete(listener) }
        }),
    }
    function addSource(id: string) {
        sources.add(id)
        for (const listener of listeners.get("sourcedata") ?? []) {
            listener()
        }
    }
    function removeSource(id: string) {
        sources.delete(id)
    }
    return { map, addSource, removeSource, listeners }
}

function makeRef(map: ReturnType<typeof makeMap>["map"]) {
    return { getMap: () => map } as unknown as MapRef
}

const terrainA: TerrainSpecification = { source: "terrain-dem-a", exaggeration: 1.5 }
const terrainB: TerrainSpecification = { source: "terrain-dem-b", exaggeration: 1.5 }

describe("useTerrain", () => {
    it("does nothing without a map", () => {
        renderHook(() => useTerrain(undefined, terrainA))
    })

    it("sets the terrain when its source is on the map", () => {
        const { map } = makeMap(["terrain-dem-a"])
        renderHook(() => useTerrain(makeRef(map), terrainA))

        expect(map.getTerrain()).toEqual(terrainA)
    })

    it("waits for the terrain source to be added before setting the terrain", () => {
        const { map, addSource } = makeMap([])
        renderHook(() => useTerrain(makeRef(map), terrainA))

        expect(map.setTerrain).not.toHaveBeenCalled()
        expect(map.on).toHaveBeenCalledWith("sourcedata", expect.any(Function))

        addSource("terrain-dem-a")
        expect(map.getTerrain()).toEqual(terrainA)
    })

    it("does not set the same terrain again on later source events", () => {
        const { map, addSource } = makeMap(["terrain-dem-a"])
        renderHook(() => useTerrain(makeRef(map), terrainA))
        addSource("other")

        expect(map.setTerrain).toHaveBeenCalledTimes(1)
    })

    it("switches to another terrain source", () => {
        const { map, removeSource } = makeMap(["terrain-dem-a", "terrain-dem-b"])
        const { rerender } = renderHook(({ options }) => useTerrain(makeRef(map), options), {
            initialProps: { options: terrainA },
        })
        removeSource("terrain-dem-a")
        rerender({ options: terrainB })

        expect(map.getTerrain()).toEqual(terrainB)
    })

    it("applies a new exaggeration", () => {
        const { map } = makeMap(["terrain-dem-a"])
        const ref = makeRef(map)
        const { rerender } = renderHook(({ options }) => useTerrain(ref, options), {
            initialProps: { options: terrainA },
        })
        rerender({ options: { ...terrainA, exaggeration: 2 } })

        expect(map.getTerrain()).toEqual({ source: "terrain-dem-a", exaggeration: 2 })
    })

    it("clears the terrain when there is none to show", () => {
        const { map } = makeMap(["terrain-dem-a"])
        const ref = makeRef(map)
        const initialProps: { options: TerrainSpecification | null } = { options: terrainA }
        const { rerender } = renderHook(({ options }) => useTerrain(ref, options), { initialProps })
        rerender({ options: null })

        expect(map.getTerrain()).toBeNull()
    })

    it("clears the terrain instead of pointing it at a source that left the map", () => {
        const { map, removeSource } = makeMap(["terrain-dem-a"])
        const ref = makeRef(map)
        const { rerender } = renderHook(({ options }) => useTerrain(ref, options), {
            initialProps: { options: terrainA },
        })
        removeSource("terrain-dem-a")
        rerender({ options: { ...terrainA } })

        expect(map.getTerrain()).toBeNull()
    })

    it("does not touch the map while there is no terrain to show or clear", () => {
        const { map } = makeMap([])
        renderHook(() => useTerrain(makeRef(map), null))

        expect(map.setTerrain).not.toHaveBeenCalled()
    })

    it("clears the terrain and stops listening on unmount", () => {
        const { map, listeners } = makeMap(["terrain-dem-a"])
        const { unmount } = renderHook(() => useTerrain(makeRef(map), terrainA))
        unmount()

        expect(map.getTerrain()).toBeNull()
        expect([...listeners.values()].every(ofType => ofType.size === 0)).toBe(true)
    })
})

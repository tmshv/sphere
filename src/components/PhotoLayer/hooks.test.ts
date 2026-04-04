import { SourceType } from "@/types"
import { act, renderHook } from "@testing-library/react"
import type { Listener, MapEventType, MapLayerEventType } from "maplibre-gl"
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/store/hooks", () => ({
    useAppSelector: vi.fn(),
}))

vi.mock("@/lib/source-reader", () => ({
    SourceReader: vi.fn().mockImplementation(() => ({
        getGeojson: vi.fn().mockResolvedValue(null),
    })),
}))

import { useAppSelector } from "@/store/hooks"
import { useFeatures } from "./hooks"

const SOURCE_ID = "test-source"
const LAYER_ID = "test-layer"

type MapEventKey = keyof MapEventType | keyof MapLayerEventType

function makeMockMap() {
    const handlers: Partial<Record<MapEventKey, Listener[]>> = {}
    return {
        on: vi.fn((event: MapEventKey, fn: Listener) => {
            if (!handlers[event]) handlers[event] = []
            handlers[event].push(fn)
        }),
        off: vi.fn((event: MapEventKey, fn: Listener) => {
            handlers[event] = (handlers[event] ?? []).filter(h => h !== fn)
        }),
        queryRenderedFeatures: vi.fn().mockReturnValue([]),
        fire(event: MapEventKey) {
            for (const fn of (handlers[event] ?? []).slice()) fn(undefined)
        },
    }
}

describe("useTileFeatures event listener behavior", () => {
    beforeEach(() => {
        vi.mocked(useAppSelector).mockImplementation((selector: any) =>
            selector({
                source: {
                    items: {
                        [SOURCE_ID]: { type: SourceType.MVT },
                    },
                },
            }),
        )
    })

    it("registers idle and moveend listeners on mount", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

        expect(map.on).toHaveBeenCalledWith("idle", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("moveend", expect.any(Function))
    })

    it("calls queryRenderedFeatures when idle fires", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

        act(() => {
            map.fire("idle")
        })

        expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ layers: [LAYER_ID] })
    })

    it("idle listener fires only once (self-removing)", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

        act(() => {
            map.fire("idle")
        })
        act(() => {
            map.fire("idle")
        })

        expect(map.queryRenderedFeatures).toHaveBeenCalledTimes(1)
    })

    it("removes idle listener from map after it fires", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

        const idleHandler = map.on.mock.calls.find(([event]) => event === "idle")?.[1]

        act(() => {
            map.fire("idle")
        })

        expect(map.off).toHaveBeenCalledWith("idle", idleHandler)
    })

    it("calls queryRenderedFeatures on moveend", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

        act(() => {
            map.fire("moveend")
        })

        expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ layers: [LAYER_ID] })
    })

    it("removes idle and moveend listeners on unmount", () => {
        const map = makeMockMap()
        const { unmount } = renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

        unmount()

        expect(map.off).toHaveBeenCalledWith("idle", expect.any(Function))
        expect(map.off).toHaveBeenCalledWith("moveend", expect.any(Function))
    })

    it("returns features queried on idle", () => {
        const feature: GeoJSON.Feature = {
            type: "Feature",
            id: "f1",
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: {},
        }
        const map = makeMockMap()
        map.queryRenderedFeatures.mockReturnValue([feature])

        const { result } = renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as any }))

        expect(result.current).toEqual([])

        act(() => {
            map.fire("idle")
        })

        expect(result.current).toEqual([feature])
    })

    it("does not register listeners when map is undefined", () => {
        const { result } = renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: undefined }))
        expect(result.current).toEqual([])
    })
})

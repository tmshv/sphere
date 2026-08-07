import type { RootState } from "@/store"
import { SourceType } from "@/types"
import { act, renderHook } from "@testing-library/react"
import type * as maplibregl from "maplibre-gl"
import type { Listener, MapEventType, MapLayerEventType } from "maplibre-gl"
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/store/hooks", () => ({
    useAppSelector: vi.fn(),
}))

const { sourceReaderMock, getGeojsonMock, getFilteredMock } = vi.hoisted(() => ({
    sourceReaderMock: vi.fn(),
    getGeojsonMock: vi.fn(),
    getFilteredMock: vi.fn(),
}))

vi.mock("@/lib/source-reader", () => ({
    SourceReader: sourceReaderMock,
}))

import { filteredSourceId } from "@/lib/layer-source"
import { useAppSelector } from "@/store/hooks"
import { useFeatures } from "./hooks"

const SOURCE_ID = "test-source"
const LAYER_ID = "test-layer"

beforeEach(() => {
    getGeojsonMock.mockReset().mockResolvedValue(null)
    getFilteredMock.mockReset().mockResolvedValue(null)
    // `new SourceReader(...)` needs a constructible implementation, so this
    // cannot be an arrow function.
    sourceReaderMock.mockReset().mockImplementation(function SourceReaderStub() {
        return { getGeojson: getGeojsonMock, getFiltered: getFilteredMock }
    })
})

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
        vi.mocked(useAppSelector).mockImplementation(selector =>
            selector({
                source: {
                    items: {
                        [SOURCE_ID]: { type: SourceType.MVT },
                    },
                },
            } as unknown as RootState),
        )
    })

    it("registers idle and moveend listeners on mount", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as maplibregl.Map }))

        expect(map.on).toHaveBeenCalledWith("idle", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("moveend", expect.any(Function))
    })

    it("calls queryRenderedFeatures when idle fires", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as maplibregl.Map }))

        act(() => {
            map.fire("idle")
        })

        expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ layers: [LAYER_ID] })
    })

    it("idle listener fires only once (self-removing)", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as maplibregl.Map }))

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
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as maplibregl.Map }))

        const idleHandler = map.on.mock.calls.find(([event]) => event === "idle")?.[1]

        act(() => {
            map.fire("idle")
        })

        expect(map.off).toHaveBeenCalledWith("idle", idleHandler)
    })

    it("calls queryRenderedFeatures on moveend", () => {
        const map = makeMockMap()
        renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as maplibregl.Map }))

        act(() => {
            map.fire("moveend")
        })

        expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ layers: [LAYER_ID] })
    })

    it("removes idle and moveend listeners on unmount", () => {
        const map = makeMockMap()
        const { unmount } = renderHook(() =>
            useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as maplibregl.Map }),
        )

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

        const { result } = renderHook(() =>
            useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: map as unknown as maplibregl.Map }),
        )

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

describe("useFeatures source resolution", () => {
    const FILTER_EXPRESSION = [">", ["get", "score"], 0.9]

    function mockState(state: unknown) {
        vi.mocked(useAppSelector).mockImplementation(selector => selector(state as RootState))
    }

    function geojsonState(layerFilter?: unknown) {
        return {
            source: {
                items: {
                    [SOURCE_ID]: { id: SOURCE_ID, type: SourceType.Geojson },
                },
            },
            layer: {
                items: {
                    [LAYER_ID]: {
                        id: LAYER_ID,
                        sourceId: SOURCE_ID,
                        ...(layerFilter ? { filter: { expression: layerFilter, error: null } } : {}),
                    },
                },
            },
        }
    }

    it("reads unfiltered geojson when the layer has no filter", async () => {
        mockState(geojsonState())

        await act(async () => {
            renderHook(() => useFeatures({ sourceId: SOURCE_ID, layerId: LAYER_ID, map: undefined }))
        })

        expect(sourceReaderMock).toHaveBeenCalledWith(SOURCE_ID)
        expect(getGeojsonMock).toHaveBeenCalled()
        expect(getFilteredMock).not.toHaveBeenCalled()
    })

    it("does not throw when given a filtered side-source id absent from the source slice", async () => {
        mockState(geojsonState(FILTER_EXPRESSION))

        await act(async () => {
            expect(() =>
                renderHook(() =>
                    useFeatures({ sourceId: filteredSourceId(LAYER_ID), layerId: LAYER_ID, map: undefined }),
                ),
            ).not.toThrow()
        })
    })

    it("reads filtered geojson from the underlying source for a filtered side-source id", async () => {
        mockState(geojsonState(FILTER_EXPRESSION))

        await act(async () => {
            renderHook(() => useFeatures({ sourceId: filteredSourceId(LAYER_ID), layerId: LAYER_ID, map: undefined }))
        })

        expect(sourceReaderMock).toHaveBeenCalledWith(SOURCE_ID)
        expect(getFilteredMock).toHaveBeenCalledWith(JSON.stringify(FILTER_EXPRESSION))
        expect(getGeojsonMock).not.toHaveBeenCalled()
    })

    it("returns no features when the side-source cannot be resolved to a layer", async () => {
        mockState({ source: { items: {} }, layer: { items: {} } })

        let result: { current: GeoJSON.Feature[] } | undefined
        await act(async () => {
            result = renderHook(() =>
                useFeatures({ sourceId: filteredSourceId("missing-layer"), layerId: LAYER_ID, map: undefined }),
            ).result
        })

        expect(result?.current).toEqual([])
        expect(sourceReaderMock).not.toHaveBeenCalled()
    })
})

// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react"
import type { MapGeoJSONFeature } from "maplibre-gl"
import type { MapRef } from "react-map-gl/maplibre"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/store/hooks", () => ({
    useAppDispatch: vi.fn(),
}))

vi.mock("./useFeatureClick", () => ({
    default: vi.fn(),
}))

import { useAppDispatch } from "@/store/hooks"
import useFeatureClick from "./useFeatureClick"
import useFeatureProperties from "./useFeatureProperties"

function makeMockMap(queryResult: unknown[] = []) {
    const handlers: Map<string, { fn: (payload: object) => void; unsubscribe: ReturnType<typeof vi.fn> }[]> = new Map()
    return {
        on: vi.fn((event: string, fn: (payload: object) => void) => {
            const unsub = vi.fn()
            if (!handlers.has(event)) handlers.set(event, [])
            const list = handlers.get(event)
            if (list) list.push({ fn, unsubscribe: unsub })
            return { unsubscribe: unsub }
        }),
        queryRenderedFeatures: vi.fn((_point: unknown, _opts: unknown) => queryResult),
        fire(event: string, payload: object = {}) {
            for (const h of handlers.get(event) ?? []) h.fn(payload)
        },
        getHandlers(event: string) {
            return handlers.get(event) ?? []
        },
    }
}

function makeRef(map: ReturnType<typeof makeMockMap>) {
    return { getMap: () => map } as unknown as MapRef
}

describe("useFeatureProperties", () => {
    let dispatch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        dispatch = vi.fn()
        vi.mocked(useAppDispatch).mockReturnValue(dispatch as unknown as ReturnType<typeof useAppDispatch>)
        vi.mocked(useFeatureClick).mockReturnValue(undefined)
    })

    it("dispatches reset when no features are clicked", () => {
        vi.mocked(useFeatureClick).mockReturnValue(undefined)
        renderHook(() => useFeatureProperties(undefined, [], 0))
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("dispatches set with feature properties when click features are present", () => {
        const features = [
            { id: 1, properties: { name: "A" } },
            { id: 2, properties: { name: "B" } },
        ] as unknown as MapGeoJSONFeature[]
        vi.mocked(useFeatureClick).mockReturnValue(features)
        renderHook(() => useFeatureProperties(undefined, ["layer-1"], 0))
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: { values: [{ name: "A" }, { name: "B" }] },
            }),
        )
    })

    it("uses empty object for features with null properties", () => {
        const features = [{ id: 1, properties: null }] as unknown as MapGeoJSONFeature[]
        vi.mocked(useFeatureClick).mockReturnValue(features)
        renderHook(() => useFeatureProperties(undefined, ["layer-1"], 0))
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { values: [{}] } }))
    })

    it("only dispatches reset (not set) when ref is undefined", () => {
        renderHook(() => useFeatureProperties(undefined, ["layer-1"], 0))
        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("does not register map listeners when layerIds is empty", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, [], 0))
        expect(map.on).not.toHaveBeenCalled()
    })

    it("registers a single mousemove and mouseout listener on the map", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1", "layer-2"], 0))
        expect(map.on).toHaveBeenCalledWith("mousemove", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("mouseout", expect.any(Function))
        expect(map.on).toHaveBeenCalledTimes(2)
    })

    it("dispatches set on mousemove when queryRenderedFeatures returns features", () => {
        const map = makeMockMap([{ id: 1, properties: { x: 1 } }])
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", { point: { x: 0, y: 0 } })
        })

        expect(map.queryRenderedFeatures).toHaveBeenCalledWith({ x: 0, y: 0 }, { layers: ["layer-1"] })
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { values: [{ x: 1 }] } }))
    })

    it("dispatches reset on mousemove when queryRenderedFeatures returns empty", () => {
        const map = makeMockMap([])
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", { point: { x: 0, y: 0 } })
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("dispatches reset on mouseout", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mouseout")
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("deduplicates features with the same id on mousemove", () => {
        const map = makeMockMap([
            { id: 1, properties: { x: 1 } },
            { id: 1, properties: { x: 1 } },
            { id: 2, properties: { x: 2 } },
        ])
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", { point: { x: 0, y: 0 } })
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { values: [{ x: 1 }, { x: 2 }] } }))
    })

    it("skips mousemove dispatch when click features are active", () => {
        const features = [{ id: 1, properties: { clicked: true } }] as unknown as MapGeoJSONFeature[]
        vi.mocked(useFeatureClick).mockReturnValue(features)
        const map = makeMockMap([{ id: 2, properties: { hovered: true } }])
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", { point: { x: 0, y: 0 } })
        })

        expect(dispatch).not.toHaveBeenCalled()
    })

    it("skips mouseout dispatch when click features are active", () => {
        const features = [{ id: 1, properties: { clicked: true } }] as unknown as MapGeoJSONFeature[]
        vi.mocked(useFeatureClick).mockReturnValue(features)
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1"], 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mouseout")
        })

        expect(dispatch).not.toHaveBeenCalled()
    })

    it("unsubscribes all listeners on unmount", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        const { unmount } = renderHook(() => useFeatureProperties(ref, ["layer-1", "layer-2"], 0))

        unmount()

        const allHandlers = [...map.getHandlers("mousemove"), ...map.getHandlers("mouseout")]
        for (const h of allHandlers) {
            expect(h.unsubscribe).toHaveBeenCalled()
        }
    })
})

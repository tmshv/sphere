// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react"
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

function makeMockMap() {
    const handlers: Map<string, { fn: Function; unsubscribe: ReturnType<typeof vi.fn> }[]> = new Map()
    return {
        on: vi.fn((event: string, layerId: string, fn: Function) => {
            const key = `${event}:${layerId}`
            const unsub = vi.fn()
            if (!handlers.has(key)) handlers.set(key, [])
            handlers.get(key)!.push({ fn, unsubscribe: unsub })
            return { unsubscribe: unsub }
        }),
        fire(event: string, layerId: string, payload: object = {}) {
            const key = `${event}:${layerId}`
            for (const h of handlers.get(key) ?? []) h.fn(payload)
        },
        getHandlers(event: string, layerId: string) {
            return handlers.get(`${event}:${layerId}`) ?? []
        },
    }
}

function makeRef(map: ReturnType<typeof makeMockMap>) {
    return { getMap: () => map } as any
}

describe("useFeatureProperties", () => {
    let dispatch: ReturnType<typeof vi.fn>

    beforeEach(() => {
        dispatch = vi.fn()
        vi.mocked(useAppDispatch).mockReturnValue(dispatch as any)
        vi.mocked(useFeatureClick).mockReturnValue(undefined)
    })

    it("dispatches reset when no features are clicked", () => {
        vi.mocked(useFeatureClick).mockReturnValue(undefined)
        renderHook(() => useFeatureProperties(undefined, undefined, 0))
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("dispatches set with feature properties when click features are present", () => {
        const features = [
            { id: 1, properties: { name: "A" } },
            { id: 2, properties: { name: "B" } },
        ] as any
        vi.mocked(useFeatureClick).mockReturnValue(features)
        renderHook(() => useFeatureProperties(undefined, "layer-1", 0))
        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: { values: [{ name: "A" }, { name: "B" }] },
            }),
        )
    })

    it("uses empty object for features with null properties", () => {
        const features = [{ id: 1, properties: null }] as any
        vi.mocked(useFeatureClick).mockReturnValue(features)
        renderHook(() => useFeatureProperties(undefined, "layer-1", 0))
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { values: [{}] } }))
    })

    it("only dispatches reset (not set) when ref is undefined", () => {
        renderHook(() => useFeatureProperties(undefined, "layer-1", 0))
        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("does not register map listeners when layerIds is undefined", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, undefined, 0))
        expect(map.on).not.toHaveBeenCalled()
    })

    it("registers mousemove and mouseout listeners for each layer id", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, ["layer-1", "layer-2"], 0))
        expect(map.on).toHaveBeenCalledWith("mousemove", "layer-1", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("mouseout", "layer-1", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("mousemove", "layer-2", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("mouseout", "layer-2", expect.any(Function))
    })

    it("registers listeners for a single string layerId", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        expect(map.on).toHaveBeenCalledWith("mousemove", "layer-1", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("mouseout", "layer-1", expect.any(Function))
    })

    it("dispatches set on mousemove with features", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", "layer-1", {
                features: [{ id: 1, properties: { x: 1 } }],
            })
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { values: [{ x: 1 }] } }))
    })

    it("dispatches reset on mousemove with empty features array", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", "layer-1", { features: [] })
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("dispatches reset on mousemove with no features field", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", "layer-1", {})
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("dispatches reset on mouseout", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mouseout", "layer-1")
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("reset") }))
    })

    it("deduplicates features with the same id on mousemove", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", "layer-1", {
                features: [
                    { id: 1, properties: { x: 1 } },
                    { id: 1, properties: { x: 1 } },
                    { id: 2, properties: { x: 2 } },
                ],
            })
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { values: [{ x: 1 }, { x: 2 }] } }))
    })

    it("includes features with undefined id even if duplicated on mousemove", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", "layer-1", {
                features: [
                    { id: undefined, properties: { x: 1 } },
                    { id: undefined, properties: { x: 2 } },
                ],
            })
        })

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: { values: [{ x: 1 }, { x: 2 }] } }))
    })

    it("skips mousemove dispatch when click features are active", () => {
        const features = [{ id: 1, properties: { clicked: true } }] as any
        vi.mocked(useFeatureClick).mockReturnValue(features)
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mousemove", "layer-1", {
                features: [{ id: 2, properties: { hovered: true } }],
            })
        })

        expect(dispatch).not.toHaveBeenCalled()
    })

    it("skips mouseout dispatch when click features are active", () => {
        const features = [{ id: 1, properties: { clicked: true } }] as any
        vi.mocked(useFeatureClick).mockReturnValue(features)
        const map = makeMockMap()
        const ref = makeRef(map)
        renderHook(() => useFeatureProperties(ref, "layer-1", 0))
        dispatch.mockClear()

        act(() => {
            map.fire("mouseout", "layer-1")
        })

        expect(dispatch).not.toHaveBeenCalled()
    })

    it("unsubscribes all listeners on unmount", () => {
        const map = makeMockMap()
        const ref = makeRef(map)
        const { unmount } = renderHook(() => useFeatureProperties(ref, ["layer-1", "layer-2"], 0))

        unmount()

        const allHandlers = [
            ...map.getHandlers("mousemove", "layer-1"),
            ...map.getHandlers("mouseout", "layer-1"),
            ...map.getHandlers("mousemove", "layer-2"),
            ...map.getHandlers("mouseout", "layer-2"),
        ]
        for (const h of allHandlers) {
            expect(h.unsubscribe).toHaveBeenCalled()
        }
    })
})

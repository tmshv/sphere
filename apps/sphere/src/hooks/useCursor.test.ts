import { renderHook } from "@testing-library/react"
import { act } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { describe, expect, it, vi } from "vitest"
import { useCursor } from "./useCursor"

function makeMockRef() {
    const on = vi.fn()
    const off = vi.fn()
    return {
        getMap: () => ({ on, off }),
        on,
        off,
    }
}

describe("useCursor", () => {
    it("returns [0, 0] when called with no ref", () => {
        const { result } = renderHook(() => useCursor(undefined))
        expect(result.current).toEqual([0, 0])
    })

    it("calls getMap().on('mousemove', ...) when a ref is provided", () => {
        const mock = makeMockRef()
        const ref = { getMap: mock.getMap } as unknown as MapRef
        renderHook(() => useCursor(ref))
        expect(mock.on).toHaveBeenCalledWith("mousemove", expect.any(Function))
    })

    it("calls getMap().off('mousemove', ...) on cleanup", () => {
        const mock = makeMockRef()
        const ref = { getMap: mock.getMap } as unknown as MapRef
        const { unmount } = renderHook(() => useCursor(ref))
        unmount()
        expect(mock.off).toHaveBeenCalledWith("mousemove", expect.any(Function))
    })

    it("updates returned coords when the mousemove callback is invoked", () => {
        const on = vi.fn()
        const off = vi.fn()
        const ref = { getMap: () => ({ on, off }) } as unknown as MapRef
        const { result } = renderHook(() => useCursor(ref))

        const callback = on.mock.calls[0][1]
        act(() => {
            callback({ lngLat: { lng: 13.5, lat: 52.3 } })
        })

        expect(result.current).toEqual([13.5, 52.3])
    })
})

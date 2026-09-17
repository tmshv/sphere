import { renderHook } from "@testing-library/react"
import { act } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { describe, expect, it, vi } from "vitest"
import { useZoom } from "./useZoom"

// A bare maplibre `zoom` event. The react-map-gl `viewState` property is
// deliberately absent — the hook must read the zoom from the map, not from an
// event that react-map-gl happens to patch on its way to the React props.
type ZoomEvent = { type: "zoom" }
type ZoomListener = (event: ZoomEvent) => void

function makeMap(initialZoom: number) {
    const listeners: ZoomListener[] = []
    let zoom = initialZoom
    const map = {
        on: vi.fn((_type: "zoom", listener: ZoomListener) => {
            listeners.push(listener)
        }),
        off: vi.fn((_type: "zoom", listener: ZoomListener) => {
            const index = listeners.indexOf(listener)
            if (index >= 0) {
                listeners.splice(index, 1)
            }
        }),
        getZoom: () => zoom,
    }
    const fireZoom = (nextZoom: number) => {
        zoom = nextZoom
        act(() => {
            for (const listener of listeners.slice()) {
                listener({ type: "zoom" })
            }
        })
    }
    return { map, fireZoom, ref: { getMap: () => map } as unknown as MapRef }
}

describe("useZoom", () => {
    it("returns 0 when no ref is provided", () => {
        const { result } = renderHook(() => useZoom(undefined))
        expect(result.current).toBe(0)
    })

    it("returns the map zoom on mount", () => {
        const { ref } = makeMap(7.5)
        const { result } = renderHook(() => useZoom(ref))
        expect(result.current).toBe(7.5)
    })

    it("subscribes to the zoom event", () => {
        const { map, ref } = makeMap(3)
        renderHook(() => useZoom(ref))
        expect(map.on).toHaveBeenCalledWith("zoom", expect.any(Function))
    })

    it("updates from the map when a zoom event without viewState fires", () => {
        const { ref, fireZoom } = makeMap(3)
        const { result } = renderHook(() => useZoom(ref))

        fireZoom(11.25)

        expect(result.current).toBe(11.25)
    })

    it("unsubscribes on unmount", () => {
        const { map, ref } = makeMap(3)
        const { unmount } = renderHook(() => useZoom(ref))
        unmount()
        expect(map.off).toHaveBeenCalledWith("zoom", expect.any(Function))
    })
})

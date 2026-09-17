import { renderHook } from "@testing-library/react"
import { act } from "react"
import type { MapRef } from "react-map-gl/maplibre"
import { describe, expect, it, vi } from "vitest"
import { usePitch } from "./usePitch"

// A bare maplibre `pitch` event. The react-map-gl `viewState` property is
// deliberately absent — the hook must read the pitch from the map, not from an
// event that react-map-gl happens to patch on its way to the React props.
type PitchEvent = { type: "pitch" }
type PitchListener = (event: PitchEvent) => void

function makeMap(initialPitch: number) {
    const listeners: PitchListener[] = []
    let pitch = initialPitch
    const map = {
        on: vi.fn((_type: "pitch", listener: PitchListener) => {
            listeners.push(listener)
        }),
        off: vi.fn((_type: "pitch", listener: PitchListener) => {
            const index = listeners.indexOf(listener)
            if (index >= 0) {
                listeners.splice(index, 1)
            }
        }),
        getPitch: () => pitch,
    }
    const firePitch = (nextPitch: number) => {
        pitch = nextPitch
        act(() => {
            for (const listener of listeners.slice()) {
                listener({ type: "pitch" })
            }
        })
    }
    return { map, firePitch, ref: { getMap: () => map } as unknown as MapRef }
}

describe("usePitch", () => {
    it("returns 0 when no ref is provided", () => {
        const { result } = renderHook(() => usePitch(undefined))
        expect(result.current).toBe(0)
    })

    it("returns the map pitch on mount", () => {
        const { ref } = makeMap(42)
        const { result } = renderHook(() => usePitch(ref))
        expect(result.current).toBe(42)
    })

    it("subscribes to the pitch event", () => {
        const { map, ref } = makeMap(0)
        renderHook(() => usePitch(ref))
        expect(map.on).toHaveBeenCalledWith("pitch", expect.any(Function))
    })

    it("updates from the map when a pitch event without viewState fires", () => {
        const { ref, firePitch } = makeMap(0)
        const { result } = renderHook(() => usePitch(ref))

        firePitch(57.5)

        expect(result.current).toBe(57.5)
    })

    it("unsubscribes on unmount", () => {
        const { map, ref } = makeMap(0)
        const { unmount } = renderHook(() => usePitch(ref))
        unmount()
        expect(map.off).toHaveBeenCalledWith("pitch", expect.any(Function))
    })
})

import { renderHook } from "@testing-library/react"
import type { Map as MaplibreMap } from "maplibre-gl"
import { act } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMapboxEvent } from "./useMapboxEvent"

const useMapMock = vi.fn()

vi.mock("react-map-gl/maplibre", () => ({
    useMap: () => useMapMock(),
}))

type MoveEndEvent = { type: "moveend" }
type MoveEndListener = (event: MoveEndEvent) => void

function makeMap() {
    const listeners: MoveEndListener[] = []
    const map = {
        on: vi.fn((_type: "moveend", listener: MoveEndListener) => {
            listeners.push(listener)
        }),
        off: vi.fn((_type: "moveend", listener: MoveEndListener) => {
            const index = listeners.indexOf(listener)
            if (index >= 0) {
                listeners.splice(index, 1)
            }
        }),
    }
    const fire = (event: MoveEndEvent) => {
        act(() => {
            for (const listener of listeners.slice()) {
                listener(event)
            }
        })
    }
    return { map: map as unknown as MaplibreMap, raw: map, fire }
}

beforeEach(() => {
    useMapMock.mockReset()
})

describe("useMapboxEvent", () => {
    it("does nothing when there is no current map", () => {
        useMapMock.mockReturnValue({ current: undefined })
        renderHook(() => useMapboxEvent("moveend", vi.fn()))
    })

    it("registers a listener for the given event", () => {
        const { map, raw } = makeMap()
        useMapMock.mockReturnValue({ current: { getMap: () => map } })

        renderHook(() => useMapboxEvent("moveend", vi.fn()))

        expect(raw.on).toHaveBeenCalledWith("moveend", expect.any(Function))
    })

    it("calls the callback with the map and the event", () => {
        const { map, fire } = makeMap()
        useMapMock.mockReturnValue({ current: { getMap: () => map } })
        const callback = vi.fn()

        renderHook(() => useMapboxEvent("moveend", callback))
        const event = { type: "moveend" } as const
        fire(event)

        expect(callback).toHaveBeenCalledWith(map, event)
    })

    it("removes the listener on unmount", () => {
        const { map, raw } = makeMap()
        useMapMock.mockReturnValue({ current: { getMap: () => map } })

        const { unmount } = renderHook(() => useMapboxEvent("moveend", vi.fn()))
        unmount()

        expect(raw.off).toHaveBeenCalledWith("moveend", expect.any(Function))
    })

    it("stops calling the callback after unmount", () => {
        const { map, fire } = makeMap()
        useMapMock.mockReturnValue({ current: { getMap: () => map } })
        const callback = vi.fn()

        const { unmount } = renderHook(() => useMapboxEvent("moveend", callback))
        unmount()
        fire({ type: "moveend" })

        expect(callback).not.toHaveBeenCalled()
    })
})

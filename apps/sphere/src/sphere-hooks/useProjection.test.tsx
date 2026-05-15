import { configureStore } from "@reduxjs/toolkit"
import { renderHook } from "@testing-library/react"
import type { MapRef } from "react-map-gl/maplibre"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import useProjection from "./useProjection"

const makeStore = (projection: "mercator" | "globe", drawing = false) =>
    configureStore({
        reducer: {
            projection: () => ({ value: projection }),
            draw: () => ({ sourceId: drawing ? "src1" : null, selectedIds: [] }),
        },
    })

type MockMap = {
    setProjection: ReturnType<typeof vi.fn>
    isStyleLoaded: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
}

const makeMap = (styleLoaded: boolean): MockMap => {
    const subscription = { unsubscribe: vi.fn() }
    return {
        setProjection: vi.fn(),
        isStyleLoaded: vi.fn(() => styleLoaded),
        on: vi.fn(() => subscription),
    }
}

const makeRef = (map: MockMap): MapRef => ({ getMap: () => map }) as unknown as MapRef

const wrapper =
    (store: ReturnType<typeof makeStore>) =>
    ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>

describe("useProjection", () => {
    it("does nothing when ref is undefined", () => {
        const store = makeStore("globe")
        renderHook(() => useProjection(undefined, "mercator"), { wrapper: wrapper(store) })
    })

    it("calls setProjection immediately when style is loaded", () => {
        const map = makeMap(true)
        const store = makeStore("globe")
        renderHook(() => useProjection(makeRef(map), "mercator"), { wrapper: wrapper(store) })
        expect(map.setProjection).toHaveBeenCalledWith({ type: "globe" })
        expect(map.on).not.toHaveBeenCalled()
    })

    it("defers setProjection to load event when style is not loaded", () => {
        const map = makeMap(false)
        const store = makeStore("globe")
        renderHook(() => useProjection(makeRef(map), "mercator"), { wrapper: wrapper(store) })
        expect(map.setProjection).not.toHaveBeenCalled()
        expect(map.on).toHaveBeenCalledWith("load", expect.any(Function))

        const loadHandler = map.on.mock.calls[0][1] as () => void
        loadHandler()
        expect(map.setProjection).toHaveBeenCalledWith({ type: "globe" })
    })

    it("restores fallback projection on unmount when style is loaded", () => {
        const map = makeMap(true)
        const store = makeStore("globe")
        const { unmount } = renderHook(() => useProjection(makeRef(map), "mercator"), {
            wrapper: wrapper(store),
        })
        map.setProjection.mockClear()
        unmount()
        expect(map.setProjection).toHaveBeenCalledWith({ type: "mercator" })
    })

    it("does not call setProjection on unmount when style is no longer loaded", () => {
        const map = makeMap(true)
        const store = makeStore("globe")
        const { unmount } = renderHook(() => useProjection(makeRef(map), "mercator"), {
            wrapper: wrapper(store),
        })
        map.setProjection.mockClear()
        map.isStyleLoaded.mockReturnValue(false)
        unmount()
        expect(map.setProjection).not.toHaveBeenCalled()
    })

    it("unsubscribes load listener on unmount", () => {
        const map = makeMap(false)
        const store = makeStore("globe")
        const { unmount } = renderHook(() => useProjection(makeRef(map), "mercator"), {
            wrapper: wrapper(store),
        })
        const subscription = map.on.mock.results[0].value as { unsubscribe: ReturnType<typeof vi.fn> }
        unmount()
        expect(subscription.unsubscribe).toHaveBeenCalled()
    })
})

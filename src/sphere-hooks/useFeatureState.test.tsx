import { configureStore } from "@reduxjs/toolkit"
import { renderHook } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import useFeatureState from "./useFeatureState"

// Minimal slices: only the fields useFeatureState reads
const makeStore = (selectedIds: number[], sourceId: string | undefined, layerId: string | undefined) =>
    configureStore({
        reducer: {
            selection: () => ({ selectedIds, sourceId, layerId }),
            layer: () => ({ items: {} }),
        },
    })

type MockMap = {
    setFeatureState: ReturnType<typeof vi.fn>
    removeFeatureState: ReturnType<typeof vi.fn>
    getLayer: ReturnType<typeof vi.fn>
}

type MockMapRef = { getMap: () => MockMap }

const makeMap = (): MockMap => ({
    setFeatureState: vi.fn(),
    removeFeatureState: vi.fn(),
    getLayer: vi.fn(),
})

const makeMapRef = (map: MockMap): MockMapRef => ({
    getMap: () => map,
})

const wrapper =
    (store: ReturnType<typeof makeStore>) =>
    ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>

describe("useFeatureState", () => {
    it("calls setFeatureState for each selected id when sourceId is set", () => {
        const map = makeMap()
        const store = makeStore([1, 2], "src1", undefined)
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        expect(map.setFeatureState).toHaveBeenCalledTimes(2)
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 1 }, { selected: true })
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 2 }, { selected: true })
    })

    it("does not call setFeatureState when selectedIds is empty", () => {
        const map = makeMap()
        const store = makeStore([], "src1", undefined)
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        expect(map.setFeatureState).not.toHaveBeenCalled()
    })

    it("resolves source from MapLibre layer when not in Redux store (preview layers)", () => {
        const map = makeMap()
        map.getLayer.mockReturnValue({ source: "src1" })
        const store = makeStore([5], undefined, "preview-src1-point")
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        expect(map.setFeatureState).toHaveBeenCalledTimes(1)
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 5 }, { selected: true })
    })
})

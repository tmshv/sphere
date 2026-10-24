import { configureStore } from "@reduxjs/toolkit"
import { renderHook, act } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import useFeatureState from "./useFeatureState"
import { emitSelectionDelta } from "@/lib/selection-bus"
import { makeGeojsonSource, makeMvtSource, makeSourceState } from "@/testutils"

type SourceFixture = ReturnType<typeof makeGeojsonSource> | ReturnType<typeof makeMvtSource>

// Minimal store: useFeatureState reads selectedLayerId and the selected source node
const makeStore = (
    selectedLayerId: string | undefined,
    selectedNodeId: string | undefined,
    sources: SourceFixture[] = selectedNodeId ? [makeGeojsonSource(selectedNodeId)] : [],
) =>
    configureStore({
        reducer: {
            layer: () => ({ items: {}, selectedId: selectedLayerId }),
            source: () => makeSourceState(sources, { selectedIds: selectedNodeId ? [selectedNodeId] : [] }),
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
    it("calls setFeatureState for added ids when sourceId is set", () => {
        const map = makeMap()
        const store = makeStore(undefined, "src1")
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        act(() => {
            emitSelectionDelta({ added: [1, 2], removed: [] })
        })
        expect(map.setFeatureState).toHaveBeenCalledTimes(2)
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 1 }, { selected: true })
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 2 }, { selected: true })
    })

    it("does not call setFeatureState when sourceId is not set", () => {
        const map = makeMap()
        const store = makeStore(undefined, undefined)
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        act(() => {
            emitSelectionDelta({ added: [1], removed: [] })
        })
        expect(map.setFeatureState).not.toHaveBeenCalled()
    })

    it("calls removeFeatureState for removed ids", () => {
        const map = makeMap()
        const store = makeStore(undefined, "src1")
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        act(() => {
            emitSelectionDelta({ added: [], removed: [3, 4] })
        })
        expect(map.removeFeatureState).toHaveBeenCalledTimes(2)
        expect(map.removeFeatureState).toHaveBeenCalledWith({ source: "src1", id: 3 })
        expect(map.removeFeatureState).toHaveBeenCalledWith({ source: "src1", id: 4 })
    })

    it("sets feature state on the parent source when a source-layer node is selected", () => {
        const map = makeMap()
        const mvt = makeMvtSource("mvt1", { sourceLayers: [{ id: "roads", name: "Roads" }] })
        const store = makeStore(undefined, "mvt1/roads", [mvt])
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        act(() => {
            emitSelectionDelta({ added: [7], removed: [] })
        })
        expect(map.setFeatureState).toHaveBeenCalledWith(
            { source: "mvt1", sourceLayer: "roads", id: 7 },
            { selected: true },
        )
    })

    it("sets feature state only on the selected source-layer, not its siblings", () => {
        const map = makeMap()
        const mvt = makeMvtSource("id", {
            sourceLayers: [
                { id: "roads", name: "Roads" },
                { id: "water", name: "Water" },
            ],
        })
        const store = makeStore(undefined, "id/roads", [mvt])
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        act(() => {
            emitSelectionDelta({ added: [7], removed: [8] })
        })
        expect(map.setFeatureState).toHaveBeenCalledWith(
            { source: "id", sourceLayer: "roads", id: 7 },
            { selected: true },
        )
        const touched = [...map.setFeatureState.mock.calls, ...map.removeFeatureState.mock.calls]
        expect(touched.some(([target]) => target.sourceLayer === "water")).toBe(false)
    })

    it("sets feature state on every source-layer when the MVT root is selected", () => {
        const map = makeMap()
        const mvt = makeMvtSource("id", {
            sourceLayers: [
                { id: "roads", name: "Roads" },
                { id: "water", name: "Water" },
            ],
        })
        const store = makeStore(undefined, "id", [mvt])
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        act(() => {
            emitSelectionDelta({ added: [7], removed: [] })
        })
        expect(map.setFeatureState).toHaveBeenCalledTimes(2)
    })

    it("resolves source from MapLibre layer when selectedLayerId is set", () => {
        const map = makeMap()
        map.getLayer.mockReturnValue({ source: "src1" })
        const store = makeStore("preview-src1-point", undefined)
        renderHook(() => useFeatureState(makeMapRef(map) as never), { wrapper: wrapper(store) })
        act(() => {
            emitSelectionDelta({ added: [5], removed: [] })
        })
        expect(map.setFeatureState).toHaveBeenCalledTimes(1)
        expect(map.setFeatureState).toHaveBeenCalledWith({ source: "src1", id: 5 }, { selected: true })
    })
})

import { configureStore } from "@reduxjs/toolkit"
import { renderHook } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"
import useFeatureSelect from "./useFeatureSelect"

const makeStore = (mapTool: "pan" | "select") =>
    configureStore({
        reducer: {
            // app.activeSidebarTab needed by selectors.preview.layerIds
            app: () => ({ mapTool, activeSidebarTab: "layers" as const }),
            // layer.items + layer.allIds needed by selectors.layer.visibleIds
            layer: () => ({ items: {}, allIds: [] }),
            // selection + source needed by selectors.preview.layerIds (no preview Redux slice exists)
            selection: () => ({ sourceId: undefined, layerId: undefined, selectedIds: [] }),
            source: () => ({ items: {} }),
        },
    })

const makeMapRef = (onFn = vi.fn()) => ({ getMap: () => ({ on: onFn }) }) as never

const wrapper =
    (store: ReturnType<typeof makeStore>) =>
    ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>

describe("useFeatureSelect", () => {
    it("registers a click listener when mapTool is pan", () => {
        const onFn = vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
        const store = makeStore("pan")
        renderHook(() => useFeatureSelect(makeMapRef(onFn)), { wrapper: wrapper(store) })
        expect(onFn).toHaveBeenCalledWith("click", expect.any(Function))
    })

    it("does not register a click listener when mapTool is select", () => {
        const onFn = vi.fn()
        const store = makeStore("select")
        renderHook(() => useFeatureSelect(makeMapRef(onFn)), { wrapper: wrapper(store) })
        expect(onFn).not.toHaveBeenCalled()
    })
})

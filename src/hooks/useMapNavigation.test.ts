import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/store/hooks", () => ({
    useAppSelector: vi.fn(),
}))

import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store/selectors"
import useMapNavigation from "./useMapNavigation"

function makeMockMap() {
    return {
        dragPan: {
            enable: vi.fn(),
            disable: vi.fn(),
        },
        scrollZoom: {
            enable: vi.fn(),
            disable: vi.fn(),
        },
        dragRotate: {
            enable: vi.fn(),
            disable: vi.fn(),
        },
        on: vi.fn(),
        off: vi.fn(),
    }
}

function makeRef(map: ReturnType<typeof makeMockMap>) {
    return { getMap: () => map } as any
}

const ALL_ENABLED = { dragPan: true, scrollZoom: true, dragRotate: true }

function mockState(settings: typeof ALL_ENABLED, navigationEnabled: boolean) {
    vi.mocked(useAppSelector).mockImplementation((selector: any) => {
        if (selector === selectors.mapInteraction.selectDragPan) return settings.dragPan
        if (selector === selectors.mapInteraction.selectScrollZoom) return settings.scrollZoom
        if (selector === selectors.mapInteraction.selectDragRotate) return settings.dragRotate
        if (selector === selectors.tools.selectNavigationEnabled) return navigationEnabled
        return undefined
    })
}

describe("useMapNavigation", () => {
    it("does nothing when ref is undefined", () => {
        mockState(ALL_ENABLED, true)
        renderHook(() => useMapNavigation(undefined))
        // no error thrown
    })

    it("enables all handlers when navigation is active and all settings are on", () => {
        mockState(ALL_ENABLED, true)
        const map = makeMockMap()
        renderHook(() => useMapNavigation(makeRef(map)))
        expect(map.dragPan.enable).toHaveBeenCalled()
        expect(map.scrollZoom.enable).toHaveBeenCalled()
        expect(map.dragRotate.enable).toHaveBeenCalled()
        expect(map.on).not.toHaveBeenCalled()
    })

    it("disables dragPan and dragRotate but keeps scrollZoom when navigation tool is inactive", () => {
        mockState(ALL_ENABLED, false)
        const map = makeMockMap()
        renderHook(() => useMapNavigation(makeRef(map)))
        expect(map.dragPan.disable).toHaveBeenCalled()
        expect(map.scrollZoom.enable).toHaveBeenCalled()
        expect(map.dragRotate.disable).toHaveBeenCalled()
        expect(map.on).not.toHaveBeenCalled()
    })

    it("disables only dragPan when dragPan setting is off", () => {
        mockState({ dragPan: false, scrollZoom: true, dragRotate: true }, true)
        const map = makeMockMap()
        renderHook(() => useMapNavigation(makeRef(map)))
        expect(map.dragPan.disable).toHaveBeenCalled()
        expect(map.scrollZoom.enable).toHaveBeenCalled()
        expect(map.dragRotate.enable).toHaveBeenCalled()
    })

    it("disables only scrollZoom when scrollZoom setting is off", () => {
        mockState({ dragPan: true, scrollZoom: false, dragRotate: true }, true)
        const map = makeMockMap()
        renderHook(() => useMapNavigation(makeRef(map)))
        expect(map.dragPan.enable).toHaveBeenCalled()
        expect(map.scrollZoom.disable).toHaveBeenCalled()
        expect(map.dragRotate.enable).toHaveBeenCalled()
        expect(map.on).not.toHaveBeenCalled()
    })

    it("disables only dragRotate when dragRotate setting is off", () => {
        mockState({ dragPan: true, scrollZoom: true, dragRotate: false }, true)
        const map = makeMockMap()
        renderHook(() => useMapNavigation(makeRef(map)))
        expect(map.dragPan.enable).toHaveBeenCalled()
        expect(map.scrollZoom.enable).toHaveBeenCalled()
        expect(map.dragRotate.disable).toHaveBeenCalled()
        expect(map.on).not.toHaveBeenCalled()
    })
})

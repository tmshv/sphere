import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/store/hooks", () => ({
    useAppSelector: vi.fn(),
}))

import { useAppSelector } from "@/store/hooks"
import { selectors } from "@/store/selectors"
import usePanMode from "./usePanMode"

function makeMockMap() {
    return {
        dragPan: {
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

describe("usePanMode", () => {
    it("does nothing when ref is undefined", () => {
        vi.mocked(useAppSelector).mockReturnValue(true)
        renderHook(() => usePanMode(undefined))
        // no error thrown
    })

    it("calls dragPan.enable() when panEnabled is true", () => {
        vi.mocked(useAppSelector).mockReturnValue(true)
        const map = makeMockMap()
        renderHook(() => usePanMode(makeRef(map)))
        expect(map.dragPan.enable).toHaveBeenCalled()
        expect(map.dragPan.disable).not.toHaveBeenCalled()
        expect(map.on).not.toHaveBeenCalled()
    })

    it("calls dragPan.disable() when panEnabled is false", () => {
        vi.mocked(useAppSelector).mockReturnValue(false)
        const map = makeMockMap()
        renderHook(() => usePanMode(makeRef(map)))
        expect(map.dragPan.disable).toHaveBeenCalled()
        expect(map.dragPan.enable).not.toHaveBeenCalled()
        expect(map.on).toHaveBeenCalledWith("mouseup", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("touchend", expect.any(Function))
        expect(map.on).toHaveBeenCalledWith("draw.modechange", expect.any(Function))
    })

    it("re-disables dragPan when Draw mounts and its onAdd re-enables it", () => {
        const panEnabled = false
        let drawing = false
        vi.mocked(useAppSelector).mockImplementation(selector => {
            if (selector === selectors.tools.selectPanEnabled) return panEnabled
            if (selector === selectors.draw.isDrawing) return drawing
            return undefined
        })

        const map = makeMockMap()
        const { rerender } = renderHook(() => usePanMode(makeRef(map)))

        expect(map.dragPan.disable).toHaveBeenCalled()
        map.dragPan.disable.mockClear()

        // Simulate Draw's onAdd re-enabling dragPan before usePanMode can react
        map.dragPan.enable()
        expect(map.dragPan.disable).not.toHaveBeenCalled()

        // drawing becomes true (Draw mounted); usePanMode re-runs effect and re-disables
        drawing = true
        rerender()

        expect(map.dragPan.disable).toHaveBeenCalled()
    })

    describe("deferred re-sync after mouseup/touchend", () => {
        beforeEach(() => vi.useFakeTimers())
        afterEach(() => vi.useRealTimers())

        it("re-disables dragPan after mouseup even if a later handler re-enabled it", () => {
            vi.mocked(useAppSelector).mockReturnValue(false)
            const map = makeMockMap()
            renderHook(() => usePanMode(makeRef(map)))

            // Capture the deferred handler registered for mouseup
            const mouseupCall = vi.mocked(map.on).mock.calls.find(([event]) => event === "mouseup")
            expect(mouseupCall).toBeDefined()
            const deferredHandler = mouseupCall![1] as () => void

            // Simulate: Draw re-enables dragPan after its own mouseup handler
            map.dragPan.enable()
            map.dragPan.disable.mockClear()

            // Fire the deferred handler (schedules setTimeout)
            deferredHandler()
            // Before timer fires, dragPan is still enabled (Draw won)
            expect(map.dragPan.disable).not.toHaveBeenCalled()

            // After timer fires, sync() runs and disables dragPan
            vi.runAllTimers()
            expect(map.dragPan.disable).toHaveBeenCalled()
        })

        it("re-disables dragPan after touchend even if a later handler re-enabled it", () => {
            vi.mocked(useAppSelector).mockReturnValue(false)
            const map = makeMockMap()
            renderHook(() => usePanMode(makeRef(map)))

            const touchendCall = vi.mocked(map.on).mock.calls.find(([event]) => event === "touchend")
            expect(touchendCall).toBeDefined()
            const deferredHandler = touchendCall![1] as () => void

            map.dragPan.enable()
            map.dragPan.disable.mockClear()

            deferredHandler()
            expect(map.dragPan.disable).not.toHaveBeenCalled()

            vi.runAllTimers()
            expect(map.dragPan.disable).toHaveBeenCalled()
        })
    })
})

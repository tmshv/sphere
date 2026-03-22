import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/store/hooks", () => ({
    useAppSelector: vi.fn(),
}))

import { useAppSelector } from "@/store/hooks"
import usePanMode from "./usePanMode"

function makeMockMap() {
    return {
        dragPan: {
            enable: vi.fn(),
            disable: vi.fn(),
        },
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
    })

    it("calls dragPan.disable() when panEnabled is false", () => {
        vi.mocked(useAppSelector).mockReturnValue(false)
        const map = makeMockMap()
        renderHook(() => usePanMode(makeRef(map)))
        expect(map.dragPan.disable).toHaveBeenCalled()
        expect(map.dragPan.enable).not.toHaveBeenCalled()
    })
})

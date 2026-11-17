import { afterEach, describe, expect, test, vi } from "vitest"
import { type DrawControlApi, focusDrawMap, getDrawControl, registerDrawControl } from "./draw-control"

function makeControl(): DrawControlApi {
    const control: DrawControlApi = {
        changeMode: vi.fn(() => control),
        getMode: vi.fn(() => "simple_select"),
        trash: vi.fn(() => control),
        combineFeatures: vi.fn(() => control),
        uncombineFeatures: vi.fn(() => control),
    }
    return control
}

const cleanups: (() => void)[] = []

function register(sourceId: string, control: DrawControlApi, focusMap: () => void = vi.fn()) {
    const unregister = registerDrawControl(sourceId, control, focusMap)
    cleanups.push(unregister)
    return unregister
}

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
})

describe("draw control registry", () => {
    test("finds the registered control by its source", () => {
        const control = makeControl()
        register("s1", control)

        expect(getDrawControl("s1")).toBe(control)
    })

    test("finds no control for another source", () => {
        register("s1", makeControl())

        expect(getDrawControl("s2")).toBeUndefined()
    })

    test("finds no control once it is unregistered", () => {
        const unregister = register("s1", makeControl())

        unregister()

        expect(getDrawControl("s1")).toBeUndefined()
    })

    test("unregistering an older control keeps the newer one", () => {
        const unregisterOld = register("s1", makeControl())
        const newer = makeControl()
        register("s1", newer)

        unregisterOld()

        expect(getDrawControl("s1")).toBe(newer)
    })

    test("focusDrawMap runs the focus function registered for the source", () => {
        const focusMap = vi.fn()
        register("s1", makeControl(), focusMap)

        focusDrawMap("s1")

        expect(focusMap).toHaveBeenCalledTimes(1)
    })

    test("focusDrawMap does nothing for another source or once unregistered", () => {
        const focusMap = vi.fn()
        const unregister = register("s1", makeControl(), focusMap)

        focusDrawMap("s2")
        unregister()
        focusDrawMap("s1")

        expect(focusMap).not.toHaveBeenCalled()
    })
})

import { afterEach, describe, expect, test, vi } from "vitest"
import { type DrawControlApi, getDrawControl, registerDrawControl } from "./draw-control"

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

function register(sourceId: string, control: DrawControlApi) {
    const unregister = registerDrawControl(sourceId, control)
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
})

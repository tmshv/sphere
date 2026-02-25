import { describe, test, expect } from "vitest"
import reducer, { projectionSlice } from "./projection"

const { setGlobe, setFlat } = projectionSlice.actions

describe("projectionSlice reducer", () => {
    test("initial state is mercator", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.value).toBe("mercator")
    })

    test("setGlobe sets value to globe", () => {
        const state = reducer(undefined, setGlobe())
        expect(state.value).toBe("globe")
    })

    test("setFlat sets value to mercator", () => {
        const prev = { value: "globe" as const }
        const state = reducer(prev, setFlat())
        expect(state.value).toBe("mercator")
    })

    test("setGlobe then setFlat returns to mercator", () => {
        let state = reducer(undefined, setGlobe())
        state = reducer(state, setFlat())
        expect(state.value).toBe("mercator")
    })

    test("setFlat is idempotent", () => {
        const state = reducer(undefined, setFlat())
        expect(state.value).toBe("mercator")
    })
})

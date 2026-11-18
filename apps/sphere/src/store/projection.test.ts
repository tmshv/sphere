import { describe, expect, test } from "vitest"
import { WEB_MERCATOR_CRS } from "@/lib/projection"
import type { RootState } from "."
import reducer, { projectionSlice, selectProjectionCrs } from "./projection"

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

describe("selectProjectionCrs", () => {
    test("is Web Mercator under mercator and globe", () => {
        for (const value of ["mercator", "globe"] as const) {
            const state = { projection: { value } } as unknown as RootState
            expect(selectProjectionCrs(state)).toBe(WEB_MERCATOR_CRS)
        }
    })
})

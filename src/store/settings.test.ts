import { describe, expect, test } from "vitest"
import reducer, { settingsSlice } from "./settings"

const { setCopyWrapAsFeatureCollection, setCopyWktSeparator } = settingsSlice.actions
const { selectCopyWrapAsFeatureCollection, selectCopyWktSeparator } = settingsSlice.selectors

import type { RootState } from "./index"

const makeRootState = (settings: object) => ({ settings }) as unknown as RootState

describe("settingsSlice reducer", () => {
    test("initial state has copyWrapAsFeatureCollection true", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.copyWrapAsFeatureCollection).toBe(true)
    })

    test("initial state has copyWktSeparator newline", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.copyWktSeparator).toBe("\n")
    })

    test("setCopyWrapAsFeatureCollection sets value to false", () => {
        const state = reducer(undefined, setCopyWrapAsFeatureCollection(false))
        expect(state.copyWrapAsFeatureCollection).toBe(false)
    })

    test("setCopyWrapAsFeatureCollection sets value to true", () => {
        const state = reducer(
            { copyWrapAsFeatureCollection: false, copyWktSeparator: "\n" },
            setCopyWrapAsFeatureCollection(true),
        )
        expect(state.copyWrapAsFeatureCollection).toBe(true)
    })

    test("setCopyWktSeparator sets value", () => {
        const state = reducer(undefined, setCopyWktSeparator(", "))
        expect(state.copyWktSeparator).toBe(", ")
    })
})

describe("settingsSlice selectors", () => {
    test("selectCopyWrapAsFeatureCollection returns value", () => {
        expect(
            selectCopyWrapAsFeatureCollection(
                makeRootState({ copyWrapAsFeatureCollection: true, copyWktSeparator: "\n" }),
            ),
        ).toBe(true)
        expect(
            selectCopyWrapAsFeatureCollection(
                makeRootState({ copyWrapAsFeatureCollection: false, copyWktSeparator: "\n" }),
            ),
        ).toBe(false)
    })

    test("selectCopyWktSeparator returns value", () => {
        expect(
            selectCopyWktSeparator(makeRootState({ copyWrapAsFeatureCollection: true, copyWktSeparator: "\n" })),
        ).toBe("\n")
        expect(
            selectCopyWktSeparator(makeRootState({ copyWrapAsFeatureCollection: true, copyWktSeparator: ", " })),
        ).toBe(", ")
    })
})

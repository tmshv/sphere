import { describe, expect, test } from "vitest"
import reducer, { mapInteractionSlice } from "./map-interaction"

const { setDragPan, setScrollZoom, setDragRotate } = mapInteractionSlice.actions
const { selectDragPan, selectScrollZoom, selectDragRotate } = mapInteractionSlice.selectors

import type { RootState } from "./index"

const makeRootState = (mapInteraction: object) => ({ mapInteraction }) as unknown as RootState

describe("mapInteractionSlice reducer", () => {
    test("initial state has all handlers enabled", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.dragPan).toBe(true)
        expect(state.scrollZoom).toBe(true)
        expect(state.dragRotate).toBe(true)
    })

    test("setDragPan disables dragPan", () => {
        const state = reducer(undefined, setDragPan(false))
        expect(state.dragPan).toBe(false)
    })

    test("setDragPan enables dragPan", () => {
        const prev = reducer(undefined, setDragPan(false))
        const state = reducer(prev, setDragPan(true))
        expect(state.dragPan).toBe(true)
    })

    test("setScrollZoom disables scrollZoom", () => {
        const state = reducer(undefined, setScrollZoom(false))
        expect(state.scrollZoom).toBe(false)
    })

    test("setScrollZoom enables scrollZoom", () => {
        const prev = reducer(undefined, setScrollZoom(false))
        const state = reducer(prev, setScrollZoom(true))
        expect(state.scrollZoom).toBe(true)
    })

    test("setDragRotate disables dragRotate", () => {
        const state = reducer(undefined, setDragRotate(false))
        expect(state.dragRotate).toBe(false)
    })

    test("setDragRotate enables dragRotate", () => {
        const prev = reducer(undefined, setDragRotate(false))
        const state = reducer(prev, setDragRotate(true))
        expect(state.dragRotate).toBe(true)
    })
})

describe("mapInteractionSlice selectors", () => {
    test("selectDragPan returns dragPan value", () => {
        expect(selectDragPan(makeRootState({ dragPan: true }))).toBe(true)
        expect(selectDragPan(makeRootState({ dragPan: false }))).toBe(false)
    })

    test("selectScrollZoom returns scrollZoom value", () => {
        expect(selectScrollZoom(makeRootState({ scrollZoom: true }))).toBe(true)
        expect(selectScrollZoom(makeRootState({ scrollZoom: false }))).toBe(false)
    })

    test("selectDragRotate returns dragRotate value", () => {
        expect(selectDragRotate(makeRootState({ dragRotate: true }))).toBe(true)
        expect(selectDragRotate(makeRootState({ dragRotate: false }))).toBe(false)
    })
})

import { describe, expect, it, test } from "vitest"
import reducer, { selectProperties, propertiesSlice } from "."
import type { RootState } from ".."
import type { PropertiesEntry } from "."

const { setHover, resetHover } = propertiesSlice.actions

function makeState(entries: PropertiesEntry[]): RootState {
    return {
        properties: { entries },
    } as unknown as RootState
}

describe("selectProperties", () => {
    it("returns null when no entries", () => {
        const state = { properties: {} } as unknown as RootState
        expect(selectProperties(state)).toBeNull()
    })

    it("converts primitive values to strings", () => {
        const state = makeState([{ id: 1, values: { name: "foo", count: 42, flag: true } }])
        const result = selectProperties(state)
        expect(result).toEqual([
            {
                id: 1,
                items: [
                    { key: "name", value: "foo" },
                    { key: "count", value: "42" },
                    { key: "flag", value: "true" },
                ],
            },
        ])
    })

    it("converts object values to JSON strings", () => {
        const geometry = { type: "Point", coordinates: [0, 0] }
        const state = makeState([{ id: 2, values: { geometry } }])
        const result = selectProperties(state)
        expect(result).toEqual([{ id: 2, items: [{ key: "geometry", value: JSON.stringify(geometry) }] }])
    })

    it("converts null values to empty string", () => {
        const state = makeState([{ id: 3, values: { empty: null } }])
        const result = selectProperties(state)
        expect(result).toEqual([{ id: 3, items: [{ key: "empty", value: "" }] }])
    })
})

describe("properties slice — hoverEntries", () => {
    test("initial hoverEntries is undefined", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.hoverEntries).toBeUndefined()
    })

    test("setHover stores entries", () => {
        const state = reducer(undefined, setHover({ entries: [{ id: 1, values: { name: "A" } }] }))
        expect(state.hoverEntries).toEqual([{ id: 1, values: { name: "A" } }])
    })

    test("resetHover clears entries", () => {
        const prev = reducer(undefined, setHover({ entries: [{ id: 1, values: {} }] }))
        const state = reducer(prev, resetHover())
        expect(state.hoverEntries).toBeUndefined()
    })

    test("setHover leaves selection entries (entries) untouched", () => {
        const prev = reducer(undefined, propertiesSlice.actions.set({ entries: [{ id: 2, values: { a: 1 } }] }))
        const state = reducer(prev, setHover({ entries: [{ id: 1, values: {} }] }))
        expect(state.entries).toEqual([{ id: 2, values: { a: 1 } }])
        expect(state.hoverEntries).toEqual([{ id: 1, values: {} }])
    })
})

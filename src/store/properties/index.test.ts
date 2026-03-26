import { describe, expect, it } from "vitest"
import { selectProperties } from "."
import type { RootState } from ".."

function makeState(values: Record<string, unknown>[]): RootState {
    return {
        properties: { values },
    } as unknown as RootState
}

describe("selectProperties", () => {
    it("returns null when no values", () => {
        const state = { properties: {} } as unknown as RootState
        expect(selectProperties(state)).toBeNull()
    })

    it("converts primitive values to strings", () => {
        const state = makeState([{ name: "foo", count: 42, flag: true }])
        const result = selectProperties(state)
        expect(result).toEqual([
            [
                { key: "name", value: "foo" },
                { key: "count", value: "42" },
                { key: "flag", value: "true" },
            ],
        ])
    })

    it("converts object values to JSON strings", () => {
        const geometry = { type: "Point", coordinates: [0, 0] }
        const state = makeState([{ geometry }])
        const result = selectProperties(state)
        expect(result).toEqual([[{ key: "geometry", value: JSON.stringify(geometry) }]])
    })

    it("converts null values to empty string", () => {
        const state = makeState([{ empty: null }])
        const result = selectProperties(state)
        expect(result).toEqual([[{ key: "empty", value: "" }]])
    })
})

import { describe, expect, it } from "vitest"
import { toPropertiesEntries } from "./properties"

describe("toPropertiesEntries", () => {
    it("converts features with IDs to entries", () => {
        const features = [
            { id: 1, properties: { name: "A" } },
            { id: 2, properties: { name: "B" } },
        ]
        expect(toPropertiesEntries(features)).toEqual([
            { id: 1, values: { name: "A" } },
            { id: 2, values: { name: "B" } },
        ])
    })

    it("skips features without IDs", () => {
        const features = [
            { id: 1, properties: { name: "A" } },
            { properties: { name: "B" } },
            { id: undefined, properties: { name: "C" } },
        ]
        expect(toPropertiesEntries(features)).toEqual([{ id: 1, values: { name: "A" } }])
    })

    it("uses empty object for null properties", () => {
        const features = [{ id: 1, properties: null }]
        expect(toPropertiesEntries(features)).toEqual([{ id: 1, values: {} }])
    })

    it("returns empty array for empty input", () => {
        expect(toPropertiesEntries([])).toEqual([])
    })

    it("handles string IDs", () => {
        const features = [{ id: "abc", properties: { x: 1 } }]
        expect(toPropertiesEntries(features)).toEqual([{ id: "abc", values: { x: 1 } }])
    })
})

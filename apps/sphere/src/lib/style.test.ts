import { describe, expect, test } from "vitest"
import { isStyle } from "./style"

describe("isStyle", () => {
    test("valid style returns true", () => {
        expect(isStyle({ version: 8, sources: {}, layers: [] })).toBe(true)
    })

    test("GeoJSON FeatureCollection returns false", () => {
        expect(isStyle({ type: "FeatureCollection", features: [] })).toBe(false)
    })

    test("missing sources returns false", () => {
        expect(isStyle({ version: 8, layers: [] })).toBe(false)
    })

    test("missing layers returns false", () => {
        expect(isStyle({ version: 8, sources: {} })).toBe(false)
    })

    test("wrong version returns false", () => {
        expect(isStyle({ version: 7, sources: {}, layers: [] })).toBe(false)
    })

    test("empty object returns false", () => {
        expect(isStyle({})).toBe(false)
    })
})

import { describe, expect, it } from "vitest"
import generateId from "./generate_id"

describe("generateId", () => {
    it("returns a non-empty string", () => {
        const id = generateId()
        expect(typeof id).toBe("string")
        expect(id.length).toBeGreaterThan(0)
    })

    it("returns a different id on every call", () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()))
        expect(ids.size).toBe(100)
    })
})

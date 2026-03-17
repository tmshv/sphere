import { nextId, nextNumber } from "@/lib/nextId"

describe("nextNumber", () => {
    it("should return the provided value if it exists", () => {
        expect(nextNumber(10)).toBe(10)
    })

    it("should return the current start value and increment it when no value is provided", () => {
        expect(nextNumber()).toBe(0)
        expect(nextNumber()).toBe(1)
        expect(nextNumber()).toBe(2)
        expect(nextNumber()).toBe(3)
        expect(nextNumber()).toBe(4)
    })
})

describe("nextId", () => {
    it("should generate a numeric ID without prefix by default", () => {
        const id = nextId()
        expect(id).toMatch(/^\d+$/)
    })

    it("should use the provided value in ID generation when given", () => {
        const id = nextId(undefined, 10)
        expect(id).toBe("10")
    })

    it("should generate a prefixed ID when prefix is provided", () => {
        const prefix = "user"
        const id = nextId(prefix)
        expect(id.startsWith(prefix)).toBeTruthy()
        expect(id).toMatch(new RegExp(/^.*\d+$/))
    })
})

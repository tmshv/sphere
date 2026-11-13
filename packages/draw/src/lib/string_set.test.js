import { describe, expect, it } from "vitest"
import StringSet from "./string_set"

describe("StringSet", () => {
    it("constructor and API", () => {
        const set = new StringSet()
        expect(set.values(), "empty by default").toEqual([])
        expect(Object.keys(set).filter(k => k[0] !== "_").length, "no unexpected properties").toBe(0)
        // Methods
        expect(typeof StringSet.prototype.add, "exposes set.add").toBe("function")
        expect(typeof StringSet.prototype.delete, "exposes set.delete").toBe("function")
        expect(typeof StringSet.prototype.has, "exposes set.has").toBe("function")
        expect(typeof StringSet.prototype.values, "exposes set.values").toBe("function")
        expect(typeof StringSet.prototype.clear, "exposes set.clear").toBe("function")
        expect(Object.keys(StringSet.prototype).filter(k => k[0] !== "_").length, "no unexpected methods").toBe(5)

        const populatedSet = new StringSet(["a", 4, "b"])
        expect(populatedSet.values(), "populated by constructor arg").toEqual(["a", 4, "b"])
    })

    it("#add", () => {
        const set = new StringSet()
        expect(set.values()).toEqual([])
        set.add("a")
        expect(set.values()).toEqual(["a"])
        set.add("b")
        expect(set.values()).toEqual(["a", "b"])
        set.add("a")
        expect(set.values()).toEqual(["a", "b"])
        set.add(3)
        expect(set.values()).toEqual(["a", "b", 3])
    })

    it("#delete", () => {
        const subject = ["a", "b", 2]
        const set = new StringSet(subject)
        set.delete("a")
        expect(set.values()).toEqual(["b", 2])
        set.delete("a")
        expect(set.values()).toEqual(["b", 2])
        set.delete()
        expect(set.values()).toEqual(["b", 2])
        set.delete("b")
        expect(set.values()).toEqual([2])
        set.delete(2)
        expect(set.values()).toEqual([])
        expect(subject, "source array not mutated").toEqual(["a", "b", 2])
    })

    it("#has", () => {
        const set = new StringSet(["a", "b", 2])
        expect(set.has("a")).toBe(true)
        expect(set.has("b")).toBe(true)
        expect(set.has(2)).toBe(true)
        expect(set.has("c")).toBe(false)
        expect(set.has(4)).toBe(false)
    })

    it("#values", () => {
        const subject = ["a", "b"]
        const set = new StringSet(subject)
        expect(set.values()).toEqual(["a", "b"])
        expect(set.values(), "array is copied, so source array is not mutable").not.toBe(subject)
    })

    it("#clear", () => {
        const set = new StringSet(["a", "b"])
        set.clear()
        expect(set.values()).toEqual([])
    })
})

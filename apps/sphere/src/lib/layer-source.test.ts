import { describe, expect, it } from "vitest"
import { filteredLayerId, filteredSourceId, resolveSourceId } from "./layer-source"

describe("filteredSourceId", () => {
    it("prepends layer- prefix", () => {
        expect(filteredSourceId("abc")).toBe("layer-abc")
    })
})

describe("filteredLayerId", () => {
    it("extracts the layer id from a filtered source id", () => {
        expect(filteredLayerId("layer-abc")).toBe("abc")
    })

    it("round-trips with filteredSourceId", () => {
        expect(filteredLayerId(filteredSourceId("abc"))).toBe("abc")
    })

    it("returns null for a regular source id", () => {
        expect(filteredLayerId("source-1")).toBeNull()
    })
})

describe("resolveSourceId", () => {
    const layers = {
        abc: { sourceId: "source-1" },
        def: { sourceId: undefined },
    }

    it("resolves a filtered source id to the real source id", () => {
        expect(resolveSourceId("layer-abc", layers)).toBe("source-1")
    })

    it("returns the original id when the layer has no sourceId", () => {
        expect(resolveSourceId("layer-def", layers)).toBe("layer-def")
    })

    it("returns the original id when the layer is not found", () => {
        expect(resolveSourceId("layer-unknown", layers)).toBe("layer-unknown")
    })

    it("passes through a regular source id unchanged", () => {
        expect(resolveSourceId("source-1", layers)).toBe("source-1")
    })
})

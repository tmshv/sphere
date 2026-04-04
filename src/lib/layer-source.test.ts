import { describe, expect, it } from "vitest"
import { filteredSourceId, resolveSourceId } from "./layer-source"

describe("filteredSourceId", () => {
    it("prepends layer- prefix", () => {
        expect(filteredSourceId("abc")).toBe("layer-abc")
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

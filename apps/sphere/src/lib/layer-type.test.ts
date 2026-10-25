import { LayerType } from "@/types"
import { describe, expect, it } from "vitest"
import { isLayerType } from "./layer-type"

describe("isLayerType", () => {
    it("accepts every LayerType value", () => {
        for (const type of Object.values(LayerType)) {
            expect(isLayerType(type)).toBe(true)
        }
    })

    it("rejects other values", () => {
        expect(isLayerType("Hexagon")).toBe(false)
        expect(isLayerType("")).toBe(false)
        expect(isLayerType(null)).toBe(false)
    })
})

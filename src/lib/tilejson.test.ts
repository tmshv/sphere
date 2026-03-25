import { describe, expect, test } from "vitest"
import { isRasterTileFormat } from "@/lib/tilejson"

describe("isRasterTileFormat", () => {
    test("returns true for png", () => {
        expect(isRasterTileFormat("png")).toBe(true)
    })

    test("returns true for jpg", () => {
        expect(isRasterTileFormat("jpg")).toBe(true)
    })

    test("returns true for webp", () => {
        expect(isRasterTileFormat("webp")).toBe(true)
    })

    test("returns false for pbf", () => {
        expect(isRasterTileFormat("pbf")).toBe(false)
    })

    test("returns false for undefined", () => {
        expect(isRasterTileFormat(undefined)).toBe(false)
    })
})

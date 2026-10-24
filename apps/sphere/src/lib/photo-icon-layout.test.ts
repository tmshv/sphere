import { describe, expect, it } from "vitest"
import { isPhotoIconLayout } from "./photo-icon-layout"

describe("isPhotoIconLayout", () => {
    it("accepts circle and square only", () => {
        expect(isPhotoIconLayout("circle")).toBe(true)
        expect(isPhotoIconLayout("square")).toBe(true)
        expect(isPhotoIconLayout("hexagon")).toBe(false)
        expect(isPhotoIconLayout(null)).toBe(false)
    })
})

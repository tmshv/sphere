import { describe, expect, it } from "vitest"
import { hexToHsv, hsvToHex, isHex } from "./hex"

describe("hex", () => {
    it("parses long and short hex, with or without #, in either case", () => {
        expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 100, v: 100 })
        expect(hexToHsv("0F0")).toEqual({ h: 120, s: 100, v: 100 })
        expect(hexToHsv("#0000FF")).toEqual({ h: 240, s: 100, v: 100 })
    })

    it("rounds hue, saturation and value to whole numbers like Mantine", () => {
        expect(hexToHsv("#1a1b1e")).toEqual({ h: 225, s: 13, v: 12 })
    })

    it("wraps a negative hue sector into 300-360 degrees", () => {
        // Red is the maximum and blue exceeds green, so the sector is negative before wrapping.
        expect(hexToHsv("#ff0080")).toEqual({ h: 330, s: 100, v: 100 })
    })

    it("treats an invalid colour as black", () => {
        expect(hexToHsv("nope")).toEqual({ h: 0, s: 0, v: 0 })
        expect(isHex("#12345")).toBe(false)
        expect(isHex("#abc")).toBe(true)
    })

    it("writes lowercase #rrggbb", () => {
        expect(hsvToHex({ h: 0, s: 100, v: 100 })).toBe("#ff0000")
        expect(hsvToHex({ h: 360, s: 100, v: 100 })).toBe("#ff0000")
        expect(hsvToHex({ h: 200, s: 50, v: 80 })).toBe("#66aacc")
        expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe("#000000")
    })

    it("round trips the colours Sphere stores", () => {
        expect(hsvToHex(hexToHsv("#fab005"))).toBe("#fab005")
    })
})

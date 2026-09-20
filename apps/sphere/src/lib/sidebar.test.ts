import { describe, expect, test } from "vitest"
import { isSidebarTab } from "./sidebar"

describe("isSidebarTab", () => {
    test("accepts sources", () => {
        expect(isSidebarTab("sources")).toBe(true)
    })

    test("accepts layers", () => {
        expect(isSidebarTab("layers")).toBe(true)
    })

    test("rejects null", () => {
        expect(isSidebarTab(null)).toBe(false)
    })

    test("rejects map-styles", () => {
        expect(isSidebarTab("map-styles")).toBe(false)
    })

    test("rejects an arbitrary string", () => {
        expect(isSidebarTab("not-a-tab")).toBe(false)
    })
})

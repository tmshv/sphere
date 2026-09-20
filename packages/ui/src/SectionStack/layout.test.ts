import { describe, expect, it } from "vitest"
import { defaultSizesOf, isSpacerVisible, mergeSections, resolveSections, SPACER_MIN_SIZE } from "./layout"
import type { SectionLayout } from "."

const HEADER_HEIGHT = 30

describe("resolveSections", () => {
    it("defaults a child with no matching row to open with no stored size", () => {
        const rows: SectionLayout[] = []

        expect(resolveSections(rows, ["outline"])).toEqual([{ name: "outline", open: true, size: null }])
    })

    it("uses the stored row when one matches a child", () => {
        const rows: SectionLayout[] = [{ name: "outline", open: false, size: 200 }]

        expect(resolveSections(rows, ["outline"])).toEqual([{ name: "outline", open: false, size: 200 }])
    })

    it("drops a row that matches no child", () => {
        const rows: SectionLayout[] = [
            { name: "outline", open: true, size: 200 },
            { name: "archived", open: false, size: 77 },
        ]

        expect(resolveSections(rows, ["outline"])).toEqual([{ name: "outline", open: true, size: 200 }])
    })

    it("returns one entry per child, in child order", () => {
        const rows: SectionLayout[] = [{ name: "details", open: true, size: 50 }]

        expect(resolveSections(rows, ["outline", "details"])).toEqual([
            { name: "outline", open: true, size: null },
            { name: "details", open: true, size: 50 },
        ])
    })
})

describe("mergeSections", () => {
    it("preserves a row that matches no resolved entry, unchanged and in place", () => {
        const rows: SectionLayout[] = [
            { name: "outline", open: true, size: 150 },
            { name: "archived", open: false, size: 77 },
        ]
        const resolved: SectionLayout[] = [{ name: "outline", open: false, size: 150 }]

        expect(mergeSections(rows, resolved)).toEqual([
            { name: "outline", open: false, size: 150 },
            { name: "archived", open: false, size: 77 },
        ])
    })

    it("appends a resolved entry that has no matching row", () => {
        const rows: SectionLayout[] = []
        const resolved: SectionLayout[] = [{ name: "outline", open: false, size: null }]

        expect(mergeSections(rows, resolved)).toEqual([{ name: "outline", open: false, size: null }])
    })

    it("leaves rows untouched when resolved is empty", () => {
        const rows: SectionLayout[] = [{ name: "outline", open: true, size: 150 }]

        expect(mergeSections(rows, [])).toEqual(rows)
    })
})

describe("isSpacerVisible", () => {
    it("is true when every section is closed", () => {
        const resolved: SectionLayout[] = [
            { name: "outline", open: false, size: 150 },
            { name: "details", open: false, size: null },
        ]

        expect(isSpacerVisible(resolved)).toBe(true)
    })

    it("is false when at least one section is open", () => {
        const resolved: SectionLayout[] = [
            { name: "outline", open: true, size: 150 },
            { name: "details", open: false, size: null },
        ]

        expect(isSpacerVisible(resolved)).toBe(false)
    })

    it("is true for an empty list", () => {
        expect(isSpacerVisible([])).toBe(true)
    })
})

describe("defaultSizesOf", () => {
    it("is undefined when an open row has no stored size", () => {
        const resolved: SectionLayout[] = [
            { name: "outline", open: true, size: null },
            { name: "details", open: false, size: null },
        ]

        expect(defaultSizesOf(resolved, HEADER_HEIGHT)).toBeUndefined()
    })

    it("uses the header height for closed rows and appends the spacer entry", () => {
        const resolved: SectionLayout[] = [
            { name: "outline", open: true, size: 200 },
            { name: "details", open: false, size: 90 },
        ]

        expect(defaultSizesOf(resolved, HEADER_HEIGHT)).toEqual([200, HEADER_HEIGHT, SPACER_MIN_SIZE])
    })

    it("ignores a closed row's stored size in favour of the header height", () => {
        const resolved: SectionLayout[] = [{ name: "outline", open: false, size: 500 }]

        expect(defaultSizesOf(resolved, HEADER_HEIGHT)).toEqual([HEADER_HEIGHT, SPACER_MIN_SIZE])
    })
})

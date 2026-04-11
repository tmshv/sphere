import type { Map as MaplibreMap } from "maplibre-gl"
import { describe, expect, it } from "vitest"
import { bboxEqual, screenToGeoBbox } from "./bbox"
import type { Bbox } from "@/types/bbox"

describe("bboxEqual", () => {
    it("returns true for identical bboxes", () => {
        const a: Bbox = [1, 2, 3, 4]
        const b: Bbox = [1, 2, 3, 4]
        expect(bboxEqual(a, b)).toBe(true)
    })

    it("returns false when west differs", () => {
        expect(bboxEqual([1, 2, 3, 4], [0, 2, 3, 4])).toBe(false)
    })

    it("returns false when south differs", () => {
        expect(bboxEqual([1, 2, 3, 4], [1, 0, 3, 4])).toBe(false)
    })

    it("returns false when east differs", () => {
        expect(bboxEqual([1, 2, 3, 4], [1, 2, 0, 4])).toBe(false)
    })

    it("returns false when north differs", () => {
        expect(bboxEqual([1, 2, 3, 4], [1, 2, 3, 0])).toBe(false)
    })

    it("handles floating-point values by strict equality", () => {
        expect(bboxEqual([0.1, 0.2, 0.3, 0.4], [0.1, 0.2, 0.3, 0.4])).toBe(true)
        expect(bboxEqual([0.1, 0.2, 0.3, 0.4], [0.1, 0.2, 0.3, 0.40000001])).toBe(false)
    })

    it("handles negative values", () => {
        expect(bboxEqual([-180, -90, 180, 90], [-180, -90, 180, 90])).toBe(true)
    })
})

type MockMapOptions = {
    containerLeft?: number
    containerTop?: number
    unprojectScale?: number
}

function makeMockMap(options: MockMapOptions = {}): MaplibreMap {
    const { containerLeft = 0, containerTop = 0, unprojectScale = 100 } = options
    return {
        getContainer: () => ({
            getBoundingClientRect: () => ({
                left: containerLeft,
                top: containerTop,
                width: 800,
                height: 600,
            }),
        }),
        unproject: ([x, y]: [number, number]) => ({
            lng: x / unprojectScale,
            lat: y / unprojectScale,
        }),
    } as unknown as MaplibreMap
}

describe("screenToGeoBbox", () => {
    it("converts left-to-right drag to a [west, south, east, north] bbox", () => {
        const map = makeMockMap()
        const bbox = screenToGeoBbox(map, { x: 100, y: 50 }, { x: 300, y: 250 })
        // sw = unproject(100, 250) = { lng: 1.0, lat: 2.5 }
        // ne = unproject(300, 50)  = { lng: 3.0, lat: 0.5 }
        expect(bbox).toEqual([1.0, 2.5, 3.0, 0.5])
    })

    it("normalizes right-to-left drag to the same geographic bbox", () => {
        const map = makeMockMap()
        const ltr = screenToGeoBbox(map, { x: 100, y: 50 }, { x: 300, y: 250 })
        const rtl = screenToGeoBbox(map, { x: 300, y: 250 }, { x: 100, y: 50 })
        expect(ltr).toEqual(rtl)
    })

    it("normalizes bottom-to-top drag to the same geographic bbox", () => {
        const map = makeMockMap()
        const topDown = screenToGeoBbox(map, { x: 100, y: 50 }, { x: 300, y: 250 })
        const bottomUp = screenToGeoBbox(map, { x: 100, y: 250 }, { x: 300, y: 50 })
        expect(topDown).toEqual(bottomUp)
    })

    it("subtracts container offset from pointer coordinates before unprojecting", () => {
        const map = makeMockMap({ containerLeft: 20, containerTop: 10 })
        const bbox = screenToGeoBbox(map, { x: 120, y: 60 }, { x: 320, y: 260 })
        // After offset: start = (100, 50), current = (300, 250)
        // sw = unproject(100, 250), ne = unproject(300, 50)
        expect(bbox).toEqual([1.0, 2.5, 3.0, 0.5])
    })

    it("returns a degenerate bbox when start and current are the same point", () => {
        const map = makeMockMap()
        const bbox = screenToGeoBbox(map, { x: 150, y: 150 }, { x: 150, y: 150 })
        expect(bbox).toEqual([1.5, 1.5, 1.5, 1.5])
    })
})

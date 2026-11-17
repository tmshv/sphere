import { expect, it } from "vitest"
import createMidpoint from "./create-midpoint"

const PRECISION = 10

function vertex(lng: number, lat: number, path: string) {
    return {
        type: "Feature" as const,
        properties: { meta: "vertex", coord_path: path },
        geometry: { type: "Point" as const, coordinates: [lng, lat] },
    }
}

function mercatorY(lat: number): number {
    return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
}

it("places the midpoint on the straight edge the map draws, in Web Mercator", () => {
    const midpoint = createMidpoint("a", vertex(10, 50, "0"), vertex(20, 60, "1"))

    expect(midpoint?.geometry.coordinates[0]).toBe(15)
    expect(midpoint?.geometry.coordinates[1]).toBeCloseTo(55.31379403672038, PRECISION)
    expect(mercatorY(midpoint?.geometry.coordinates[1] ?? Number.NaN)).toBeCloseTo(
        (mercatorY(50) + mercatorY(60)) / 2,
        PRECISION,
    )
})

it("keeps the lng and lat properties equal to the geometry", () => {
    const midpoint = createMidpoint("a", vertex(10, -60, "0"), vertex(20, -50, "1"))

    expect(midpoint?.properties.lng).toBe(midpoint?.geometry.coordinates[0])
    expect(midpoint?.properties.lat).toBe(midpoint?.geometry.coordinates[1])
    expect(midpoint?.properties.lat).toBeCloseTo(-55.31379403672039, PRECISION)
    expect(midpoint?.properties.coord_path).toBe("1")
})

it("keeps the plain average on a horizontal edge", () => {
    const midpoint = createMidpoint("a", vertex(0, 40, "0"), vertex(10, 40, "1"))

    expect(midpoint?.geometry.coordinates).toEqual([5, 40])
})

it("returns no midpoint for a vertex beyond the rendered latitude", () => {
    expect(createMidpoint("a", vertex(0, 86, "0"), vertex(10, 40, "1"))).toBeNull()
})

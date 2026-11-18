import { describe, expect, test } from "vitest"
import type { DrawStyleLayer } from "../types"
import { classicPreset } from "./classic"
import snapshot from "./classic.snapshot.json"
import { spherePreset, type SpherePresetOptions } from "./sphere"

const OPTIONS: SpherePresetOptions = { color: "black", highlightColor: "red", outline: true, pointRadius: 3 }
const FILL_OPACITY = 0.15
const FEATURE_PROPERTIES = ["active", "meta", "$type"]

type Paint = Record<string, unknown>

function find(layers: DrawStyleLayer[], id: string): DrawStyleLayer | undefined {
    return layers.find(layer => layer.id === id)
}

function isPaint(value: unknown): value is Paint {
    return typeof value === "object" && value !== null
}

function paintOf(layers: DrawStyleLayer[], id: string): Paint {
    const paint = find(layers, id)?.paint
    expect(isPaint(paint), id).toBe(true)
    return isPaint(paint) ? paint : {}
}

function mentions(filter: unknown, name: string): boolean {
    return JSON.stringify(filter).includes(`"${name}"`)
}

describe("classicPreset", () => {
    test("equals the former default theme", () => {
        expect(classicPreset).toEqual(snapshot)
    })
})

describe("spherePreset", () => {
    const layers = spherePreset(OPTIONS)

    test("fills polygons with the preview opacity", () => {
        expect(paintOf(layers, "sphere-polygon-fill-inactive")).toMatchObject({
            "fill-color": "black",
            "fill-opacity": FILL_OPACITY,
        })
        expect(paintOf(layers, "sphere-polygon-fill-active")).toMatchObject({
            "fill-color": "red",
            "fill-opacity": FILL_OPACITY,
        })
    })

    test("draws the white inner polygon outline", () => {
        for (const state of ["inactive", "active"]) {
            expect(paintOf(layers, `sphere-polygon-outline-${state}`)).toMatchObject({
                "line-color": "white",
                "line-width": 1,
                "line-offset": -1,
            })
        }
    })

    test("draws the polygon edge solid, in the highlight colour when active", () => {
        const inactive = paintOf(layers, "sphere-polygon-edge-inactive")
        expect(inactive).toMatchObject({ "line-color": "black", "line-width": 1 })
        expect(inactive["line-dasharray"]).toBeUndefined()
        const active = paintOf(layers, "sphere-polygon-edge-active")
        expect(active).toMatchObject({ "line-color": "red", "line-width": 1 })
        expect(active["line-dasharray"]).toBeUndefined()
    })

    test("draws the white line casing", () => {
        for (const state of ["inactive", "active"]) {
            expect(paintOf(layers, `sphere-line-casing-${state}`)).toMatchObject({
                "line-color": "white",
                "line-width": 3,
            })
        }
    })

    test("draws the line solid, in the highlight colour when active", () => {
        const inactive = paintOf(layers, "sphere-line-inactive")
        expect(inactive).toMatchObject({ "line-color": "black", "line-width": 1 })
        expect(inactive["line-dasharray"]).toBeUndefined()
        const active = paintOf(layers, "sphere-line-active")
        expect(active).toMatchObject({ "line-color": "red", "line-width": 1 })
        expect(active["line-dasharray"]).toBeUndefined()
    })

    test("draws points with a white stroke", () => {
        expect(paintOf(layers, "sphere-point-inactive")).toMatchObject({
            "circle-radius": 3,
            "circle-color": "black",
            "circle-stroke-color": "white",
            "circle-stroke-width": 1,
        })
        expect(paintOf(layers, "sphere-point-active")).toMatchObject({
            "circle-radius": 3,
            "circle-color": "red",
            "circle-stroke-color": "white",
            "circle-stroke-width": 1,
        })
    })

    test("draws vertices and midpoints in the highlight colour over a white ring", () => {
        for (const meta of ["vertex", "midpoint"]) {
            expect(paintOf(layers, `sphere-${meta}-ring`)["circle-color"]).toBe("white")
            expect(paintOf(layers, `sphere-${meta}`)["circle-color"]).toBe("red")
        }
    })

    test("omits the casing and inner outline without outline, and strokes no points", () => {
        const plain = spherePreset({ ...OPTIONS, outline: false })
        expect(find(plain, "sphere-polygon-outline-inactive")).toBeUndefined()
        expect(find(plain, "sphere-polygon-outline-active")).toBeUndefined()
        expect(find(plain, "sphere-line-casing-inactive")).toBeUndefined()
        expect(find(plain, "sphere-line-casing-active")).toBeUndefined()
        expect(paintOf(plain, "sphere-point-inactive")["circle-stroke-width"]).toBe(0)
        expect(paintOf(plain, "sphere-point-active")["circle-stroke-width"]).toBe(0)
    })

    test("gives every layer a unique id", () => {
        const ids = layers.map(layer => layer.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    test("keeps draw's filter contract", () => {
        for (const layer of layers) {
            expect(layer.filter, layer.id).toBeDefined()
            expect(mentions(layer.filter, "$type"), layer.id).toBe(true)
            expect(
                FEATURE_PROPERTIES.some(name => mentions(layer.filter, name)),
                layer.id,
            ).toBe(true)
            if (layer.id.endsWith("-inactive") && !layer.id.includes("vertex") && !layer.id.includes("midpoint")) {
                expect(JSON.stringify(layer.filter), layer.id).toContain('["!=","mode","static"]')
            }
        }
    })
})

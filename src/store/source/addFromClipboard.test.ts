import { configureStore } from "@reduxjs/toolkit"
import { type MockInstance, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
    readText: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn().mockResolvedValue({ id: "test-id", name: "Pasted GeoJSON", location: "memory://test-id" }),
}))

vi.mock("@/logger", () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock(".", () => ({
    actions: {
        addInMemorySource: vi.fn().mockImplementation((payload: unknown) => ({
            type: "source/addInMemorySource",
            payload,
        })),
    },
    computeGeometryMeta: vi.fn().mockImplementation((fc: GeoJSON.FeatureCollection) => ({
        columns: {},
        pointsCount: fc.features.filter(f => f.geometry?.type === "Point" || f.geometry?.type === "MultiPoint").length,
        linesCount: fc.features.filter(f => f.geometry?.type === "LineString" || f.geometry?.type === "MultiLineString")
            .length,
        polygonsCount: fc.features.filter(f => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon")
            .length,
    })),
}))

import { invoke } from "@tauri-apps/api/core"
import { readText } from "@tauri-apps/plugin-clipboard-manager"
import { actions } from "."
import addFromClipboard from "./addFromClipboard"

const mockReadText = vi.mocked(readText)
const mockInvoke = vi.mocked(invoke)
const mockAddInMemorySource = vi.mocked(actions.addInMemorySource)

const makeStore = () => configureStore({ reducer: (state: Record<string, never> = {}) => state })

const featureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: { type: "Point", coordinates: [10, 20] },
            properties: { name: "hello", count: 42 },
        },
    ],
}

const feature: GeoJSON.Feature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [1, 2] },
    properties: { label: "test" },
}

const geometry: GeoJSON.Point = {
    type: "Point",
    coordinates: [5, 6],
}

describe("addFromClipboard thunk", () => {
    let store: ReturnType<typeof makeStore>
    let dispatchSpy: MockInstance

    beforeEach(() => {
        vi.clearAllMocks()
        mockInvoke.mockResolvedValue({ id: "test-id", name: "Pasted GeoJSON", location: "memory://test-id" })
        store = makeStore()
        dispatchSpy = vi.spyOn(store, "dispatch")
    })

    test("calls invoke with source_add_data when clipboard contains a FeatureCollection", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(featureCollection))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
        expect(mockInvoke).toHaveBeenCalledWith("source_add_data", expect.objectContaining({ name: "Pasted GeoJSON" }))
        const [, args] = mockInvoke.mock.calls[0] as [string, { name: string; data: GeoJSON.FeatureCollection }]
        const parsed = args.data
        expect(parsed.type).toBe("FeatureCollection")
        expect(parsed.features).toHaveLength(1)
    })

    test("dispatches addInMemorySource with result from invoke", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(featureCollection))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddInMemorySource).toHaveBeenCalledOnce()
        const call = mockAddInMemorySource.mock.calls[0][0]
        expect(call.id).toBe("test-id")
        expect(call.name).toBe("Pasted GeoJSON")
        expect(call.location).toBe("memory://test-id")
        expect(call.meta.pointsCount).toBe(1)
        expect(call.meta.linesCount).toBe(0)
        expect(call.meta.polygonsCount).toBe(0)
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "source/addInMemorySource" }))
    })

    test("wraps a Feature into a FeatureCollection and sends it via invoke", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(feature))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
        const [, args] = mockInvoke.mock.calls[0] as [string, { name: string; data: GeoJSON.FeatureCollection }]
        const parsed = args.data
        expect(parsed.type).toBe("FeatureCollection")
        expect(parsed.features).toHaveLength(1)
        expect(parsed.features[0]).toEqual(feature)
    })

    test("wraps a Geometry into a FeatureCollection and sends it via invoke", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(geometry))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
        const [, args] = mockInvoke.mock.calls[0] as [string, { name: string; data: GeoJSON.FeatureCollection }]
        const parsed = args.data
        expect(parsed.type).toBe("FeatureCollection")
        expect(parsed.features).toHaveLength(1)
        expect(parsed.features[0].geometry).toEqual(geometry)
    })

    test("calls invoke twice with different data per call", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(featureCollection))
        mockInvoke
            .mockResolvedValueOnce({ id: "id-1", name: "Pasted GeoJSON", location: "memory://id-1" })
            .mockResolvedValueOnce({ id: "id-2", name: "Pasted GeoJSON", location: "memory://id-2" })

        await addFromClipboard()(store.dispatch, store.getState, undefined)
        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledTimes(2)
        const ids = mockAddInMemorySource.mock.calls.map(([p]) => p.id)
        expect(ids[0]).toBe("id-1")
        expect(ids[1]).toBe("id-2")
        expect(ids[0]).not.toBe(ids[1])
    })

    test("does nothing when clipboard is empty", async () => {
        mockReadText.mockResolvedValue(null as unknown as string)

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains an empty string", async () => {
        mockReadText.mockResolvedValue("")

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains non-JSON text", async () => {
        mockReadText.mockResolvedValue("hello world")

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains JSON that is not GeoJSON", async () => {
        mockReadText.mockResolvedValue(JSON.stringify({ foo: "bar" }))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains JSON with invalid GeoJSON type", async () => {
        mockReadText.mockResolvedValue(JSON.stringify({ type: "Unknown" }))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).not.toHaveBeenCalled()
    })

    test("does not throw when readText rejects", async () => {
        mockReadText.mockRejectedValue(new Error("clipboard error"))

        await expect(addFromClipboard()(store.dispatch, store.getState, undefined)).resolves.not.toThrow()

        expect(mockInvoke).not.toHaveBeenCalled()
    })

    test("expands a top-level GeometryCollection into a FeatureCollection", async () => {
        const gc: GeoJSON.GeometryCollection = {
            type: "GeometryCollection",
            geometries: [
                { type: "Point", coordinates: [1, 2] },
                {
                    type: "LineString",
                    coordinates: [
                        [0, 0],
                        [1, 1],
                    ],
                },
            ],
        }
        mockReadText.mockResolvedValue(JSON.stringify(gc))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
        const [, args] = mockInvoke.mock.calls[0] as [string, { name: string; data: GeoJSON.FeatureCollection }]
        const parsed = args.data
        expect(parsed.features).toHaveLength(2)
        expect(parsed.features[0].geometry.type).toBe("Point")
        expect(parsed.features[1].geometry.type).toBe("LineString")
    })

    test("expands a Feature with GeometryCollection geometry into multiple features", async () => {
        const gcFeature: GeoJSON.Feature = {
            type: "Feature",
            geometry: {
                type: "GeometryCollection",
                geometries: [
                    { type: "Point", coordinates: [1, 2] },
                    {
                        type: "LineString",
                        coordinates: [
                            [0, 0],
                            [1, 1],
                        ],
                    },
                ],
            },
            properties: { name: "test" },
        }
        mockReadText.mockResolvedValue(JSON.stringify(gcFeature))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
        const [, args] = mockInvoke.mock.calls[0] as [string, { name: string; data: GeoJSON.FeatureCollection }]
        const parsed = args.data
        expect(parsed.features).toHaveLength(2)
        expect(parsed.features[0].geometry.type).toBe("Point")
        expect(parsed.features[0].properties).toEqual({ name: "test" })
        expect(parsed.features[1].geometry.type).toBe("LineString")
    })

    test("expands FeatureCollection features with GeometryCollection geometry", async () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [0, 0] },
                    properties: { a: 1 },
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "GeometryCollection",
                        geometries: [
                            {
                                type: "LineString",
                                coordinates: [
                                    [0, 0],
                                    [1, 1],
                                ],
                            },
                            {
                                type: "Polygon",
                                coordinates: [
                                    [
                                        [0, 0],
                                        [1, 0],
                                        [1, 1],
                                        [0, 0],
                                    ],
                                ],
                            },
                        ],
                    },
                    properties: { b: 2 },
                },
            ],
        }
        mockReadText.mockResolvedValue(JSON.stringify(fc))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
        const [, args] = mockInvoke.mock.calls[0] as [string, { name: string; data: GeoJSON.FeatureCollection }]
        const parsed = args.data
        expect(parsed.features).toHaveLength(3)
        expect(parsed.features[0].geometry.type).toBe("Point")
        expect(parsed.features[1].geometry.type).toBe("LineString")
        expect(parsed.features[1].properties).toEqual({ b: 2 })
        expect(parsed.features[2].geometry.type).toBe("Polygon")
    })

    test("handles features with null properties without throwing", async () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: null }],
        }
        mockReadText.mockResolvedValue(JSON.stringify(fc))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockInvoke).toHaveBeenCalledOnce()
    })
})

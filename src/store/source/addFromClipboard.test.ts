import { vi, describe, test, expect, beforeEach, type MockInstance } from "vitest"
import { configureStore } from "@reduxjs/toolkit"

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
    readText: vi.fn(),
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
        addFeatureCollection: vi.fn().mockImplementation((payload: unknown) => ({
            type: "source/addFeatureCollection",
            payload,
        })),
    },
}))

import { readText } from "@tauri-apps/plugin-clipboard-manager"
import { actions } from "."
import addFromClipboard from "./addFromClipboard"

const mockReadText = vi.mocked(readText)
const mockAddFeatureCollection = vi.mocked(actions.addFeatureCollection)

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
        store = makeStore()
        dispatchSpy = vi.spyOn(store, "dispatch")
    })

    test("dispatches addFeatureCollection when clipboard contains a FeatureCollection", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(featureCollection))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).toHaveBeenCalledOnce()
        const call = mockAddFeatureCollection.mock.calls[0][0]
        expect(call.name).toBe("Pasted GeoJSON")
        expect(call.dataset).toMatchObject({ type: "FeatureCollection" })
        expect(call.dataset!.features).toHaveLength(1)
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: "source/addFeatureCollection" }),
        )
    })

    test("wraps a Feature into a FeatureCollection", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(feature))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).toHaveBeenCalledOnce()
        const call = mockAddFeatureCollection.mock.calls[0][0]
        expect(call.dataset!.type).toBe("FeatureCollection")
        expect(call.dataset!.features).toHaveLength(1)
        expect(call.dataset!.features[0]).toEqual(feature)
    })

    test("wraps a Geometry into a FeatureCollection", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(geometry))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).toHaveBeenCalledOnce()
        const call = mockAddFeatureCollection.mock.calls[0][0]
        expect(call.dataset!.type).toBe("FeatureCollection")
        expect(call.dataset!.features).toHaveLength(1)
        expect(call.dataset!.features[0].geometry).toEqual(geometry)
    })

    test("generates a unique id per call", async () => {
        mockReadText.mockResolvedValue(JSON.stringify(featureCollection))

        await addFromClipboard()(store.dispatch, store.getState, undefined)
        await addFromClipboard()(store.dispatch, store.getState, undefined)

        const ids = mockAddFeatureCollection.mock.calls.map(([p]) => p.id)
        expect(ids[0]).toBeTruthy()
        expect(ids[1]).toBeTruthy()
        expect(ids[0]).not.toBe(ids[1])
    })

    test("does nothing when clipboard is empty", async () => {
        mockReadText.mockResolvedValue(null as unknown as string)

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains an empty string", async () => {
        mockReadText.mockResolvedValue("")

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains non-JSON text", async () => {
        mockReadText.mockResolvedValue("hello world")

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains JSON that is not GeoJSON", async () => {
        mockReadText.mockResolvedValue(JSON.stringify({ foo: "bar" }))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).not.toHaveBeenCalled()
    })

    test("does nothing when clipboard contains JSON with invalid GeoJSON type", async () => {
        mockReadText.mockResolvedValue(JSON.stringify({ type: "Unknown" }))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).not.toHaveBeenCalled()
    })

    test("does not throw when readText rejects", async () => {
        mockReadText.mockRejectedValue(new Error("clipboard error"))

        await expect(
            addFromClipboard()(store.dispatch, store.getState, undefined),
        ).resolves.not.toThrow()

        expect(mockAddFeatureCollection).not.toHaveBeenCalled()
    })

    test("handles features with null properties without throwing", async () => {
        const fc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [
                { type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: null },
            ],
        }
        mockReadText.mockResolvedValue(JSON.stringify(fc))

        await addFromClipboard()(store.dispatch, store.getState, undefined)

        expect(mockAddFeatureCollection).toHaveBeenCalledOnce()
    })
})

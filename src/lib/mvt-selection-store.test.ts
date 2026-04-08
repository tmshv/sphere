import { describe, it, expect, beforeEach, vi } from "vitest"
import type { FeatureCollection } from "geojson"
import { getMvtSelection, setMvtSelection, clearMvtSelection, onMvtSelectionUpdate } from "./mvt-selection-store"

const emptyFc: FeatureCollection = { type: "FeatureCollection", features: [] }

const sampleFc: FeatureCollection = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            id: 1,
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: { name: "test" },
        },
    ],
}

beforeEach(() => {
    clearMvtSelection()
})

describe("mvt-selection-store", () => {
    it("starts empty", () => {
        expect(getMvtSelection()).toEqual(emptyFc)
    })

    it("stores and retrieves a FeatureCollection", () => {
        setMvtSelection(sampleFc)
        expect(getMvtSelection()).toEqual(sampleFc)
    })

    it("clear resets to empty", () => {
        setMvtSelection(sampleFc)
        clearMvtSelection()
        expect(getMvtSelection()).toEqual(emptyFc)
    })

    it("notifies listener on set", () => {
        const listener = vi.fn()
        const unsub = onMvtSelectionUpdate(listener)
        setMvtSelection(sampleFc)
        expect(listener).toHaveBeenCalledOnce()
        expect(listener).toHaveBeenCalledWith(sampleFc)
        unsub()
    })

    it("notifies listener on clear", () => {
        const listener = vi.fn()
        const unsub = onMvtSelectionUpdate(listener)
        clearMvtSelection()
        expect(listener).toHaveBeenCalledOnce()
        expect(listener).toHaveBeenCalledWith(emptyFc)
        unsub()
    })

    it("unsubscribe stops notifications", () => {
        const listener = vi.fn()
        const unsub = onMvtSelectionUpdate(listener)
        unsub()
        setMvtSelection(sampleFc)
        expect(listener).not.toHaveBeenCalled()
    })
})

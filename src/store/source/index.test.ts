import { describe, test, expect } from "vitest"
import reducer, { sourceSlice } from "./index"
import { SourceType } from "@/types"

const { addGeojsonSource, addMVTSource, addRasterSource, removeSource, setName, setData, addFeatureCollection } = sourceSlice.actions
const { items, allIds } = sourceSlice.selectors

const makeRootState = (source: object) => ({ source } as any)

const emptyFeatureCollection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [],
}

describe("sourceSlice reducer", () => {
    test("initial state", () => {
        const state = reducer(undefined, { type: "@@INIT" })
        expect(state.items).toEqual({})
        expect(state.allIds).toEqual([])
        expect(state.lastAdded).toBeUndefined()
    })

    test("addGeojsonSource adds to items and allIds, sets lastAdded", () => {
        const state = reducer(undefined, addGeojsonSource({
            id: "s1",
            name: "My Source",
            location: "file.geojson",
            metadata: {},
        }))
        expect(state.allIds).toContain("s1")
        expect(state.items["s1"]).toBeDefined()
        expect(state.items["s1"].name).toBe("My Source")
        expect(state.items["s1"].type).toBe(SourceType.Geojson)
        expect(state.lastAdded).toBe("s1")
    })

    test("addMVTSource adds to items and allIds, sets lastAdded", () => {
        const state = reducer(undefined, addMVTSource({
            id: "s2",
            name: "MVT Source",
            location: "tiles.mbtiles",
            tilejson: { tilejson: "2.0.0", tiles: [] },
        }))
        expect(state.allIds).toContain("s2")
        expect(state.items["s2"].type).toBe(SourceType.MVT)
        expect(state.lastAdded).toBe("s2")
    })

    test("addRasterSource adds to items and allIds, sets lastAdded", () => {
        const state = reducer(undefined, addRasterSource({
            id: "s3",
            name: "Raster Source",
            location: "raster.mbtiles",
        }))
        expect(state.allIds).toContain("s3")
        expect(state.items["s3"].type).toBe(SourceType.Raster)
        expect(state.lastAdded).toBe("s3")
    })

    test("addFeatureCollection adds to items and allIds, sets lastAdded", () => {
        const state = reducer(undefined, addFeatureCollection({
            id: "s4",
            name: "FC Source",
            dataset: emptyFeatureCollection,
        }))
        expect(state.allIds).toContain("s4")
        expect(state.items["s4"].type).toBe(SourceType.FeatureCollection)
        expect(state.lastAdded).toBe("s4")
    })

    test("removeSource removes from items and allIds", () => {
        const prev = reducer(undefined, addGeojsonSource({
            id: "s1",
            name: "My Source",
            location: "file.geojson",
            metadata: {},
        }))
        const state = reducer(prev, removeSource("s1"))
        expect(state.allIds).not.toContain("s1")
        expect(state.items["s1"]).toBeUndefined()
    })

    test("removeSource clears lastAdded when it matches", () => {
        const prev = reducer(undefined, addGeojsonSource({
            id: "s1",
            name: "My Source",
            location: "file.geojson",
            metadata: {},
        }))
        const state = reducer(prev, removeSource("s1"))
        expect(state.lastAdded).toBeUndefined()
    })

    test("removeSource does not clear lastAdded when it differs", () => {
        let state = reducer(undefined, addGeojsonSource({
            id: "s1",
            name: "Source 1",
            location: "file1.geojson",
            metadata: {},
        }))
        state = reducer(state, addGeojsonSource({
            id: "s2",
            name: "Source 2",
            location: "file2.geojson",
            metadata: {},
        }))
        state = reducer(state, removeSource("s1"))
        expect(state.lastAdded).toBe("s2")
    })

    test("setName updates name of source", () => {
        const prev = reducer(undefined, addGeojsonSource({
            id: "s1",
            name: "Old Name",
            location: "file.geojson",
            metadata: {},
        }))
        const state = reducer(prev, setName({ id: "s1", value: "New Name" }))
        expect(state.items["s1"].name).toBe("New Name")
    })

    test("setData updates dataset and meta", () => {
        const prev = reducer(undefined, addFeatureCollection({
            id: "s1",
            name: "My Source",
            dataset: emptyFeatureCollection,
        }))
        const newDataset: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: null, properties: {} }],
        }
        const state = reducer(prev, setData({
            id: "s1",
            dataset: newDataset,
            meta: { pointsCount: 1, linesCount: 0, polygonsCount: 0 },
        }))
        expect((state.items["s1"] as any).dataset).toEqual(newDataset)
        expect(state.items["s1"].pending).toBe(false)
    })
})

describe("sourceSlice selectors", () => {
    test("items returns items map", () => {
        const sourceState = { items: { s1: { id: "s1" } }, allIds: ["s1"] }
        expect(items(makeRootState(sourceState))).toEqual(sourceState.items)
    })

    test("allIds returns id array", () => {
        const sourceState = { items: {}, allIds: ["s1", "s2"] }
        expect(allIds(makeRootState(sourceState))).toEqual(["s1", "s2"])
    })
})

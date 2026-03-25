import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import reducer, { sourceSlice } from "./index"

const {
    addGeojsonSource,
    addMVTSource,
    addRasterSource,
    removeSource,
    select,
    setName,
    setData,
    addFeatureCollection,
} = sourceSlice.actions
// Note: addGeojsonSource no longer accepts a `dataset` parameter (M2: dataset removed from GeojsonSource)
const { items, allIds, selectSelectedId } = sourceSlice.selectors

const makeRootState = (source: object) => ({ source }) as any

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
        const state = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "My Source",
                location: "file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        expect(state.allIds).toContain("s1")
        expect(state.items.s1).toBeDefined()
        expect(state.items.s1.name).toBe("My Source")
        expect(state.items.s1.type).toBe(SourceType.Geojson)
        expect(state.items.s1.editable).toBe(false)
        expect(state.lastAdded).toBe("s1")
    })

    test("addMVTSource adds to items and allIds, sets lastAdded", () => {
        const state = reducer(
            undefined,
            addMVTSource({
                id: "s2",
                name: "MVT Source",
                location: "tiles.mbtiles",
                format: "pbf",
                tilejson: {
                    tilejson: "3.0.0",
                    tiles: [],
                    vector_layers: [],
                    attribution: null,
                    description: null,
                    legend: null,
                    template: null,
                    name: null,
                },
            }),
        )
        expect(state.allIds).toContain("s2")
        expect(state.items.s2.type).toBe(SourceType.MVT)
        const s2 = state.items.s2
        if (s2.type === SourceType.MVT) {
            expect(s2.format).toBe("pbf")
        }
        expect(state.lastAdded).toBe("s2")
    })

    test("addRasterSource adds to items and allIds, sets lastAdded", () => {
        const state = reducer(
            undefined,
            addRasterSource({
                id: "s3",
                name: "Raster Source",
                location: "raster.mbtiles",
            }),
        )
        expect(state.allIds).toContain("s3")
        expect(state.items.s3.type).toBe(SourceType.Raster)
        expect(state.lastAdded).toBe("s3")
    })

    test("addFeatureCollection adds to items and allIds, sets lastAdded", () => {
        const state = reducer(
            undefined,
            addFeatureCollection({
                id: "s4",
                name: "FC Source",
                dataset: emptyFeatureCollection,
            }),
        )
        expect(state.allIds).toContain("s4")
        expect(state.items.s4.type).toBe(SourceType.FeatureCollection)
        expect(state.items.s4.editable).toBe(true)
        expect(state.lastAdded).toBe("s4")
    })

    test("removeSource removes from items and allIds", () => {
        const prev = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "My Source",
                location: "file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        const state = reducer(prev, removeSource("s1"))
        expect(state.allIds).not.toContain("s1")
        expect(state.items.s1).toBeUndefined()
    })

    test("removeSource clears lastAdded when it matches", () => {
        const prev = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "My Source",
                location: "file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        const state = reducer(prev, removeSource("s1"))
        expect(state.lastAdded).toBeUndefined()
    })

    test("removeSource does not clear lastAdded when it differs", () => {
        let state = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "Source 1",
                location: "file1.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        state = reducer(
            state,
            addGeojsonSource({
                id: "s2",
                name: "Source 2",
                location: "file2.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        state = reducer(state, removeSource("s1"))
        expect(state.lastAdded).toBe("s2")
    })

    test("setName updates name of source", () => {
        const prev = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "Old Name",
                location: "file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        const state = reducer(prev, setName({ id: "s1", value: "New Name" }))
        expect(state.items.s1.name).toBe("New Name")
    })

    test("setData updates dataset and meta", () => {
        const prev = reducer(
            undefined,
            addFeatureCollection({
                id: "s1",
                name: "My Source",
                dataset: emptyFeatureCollection,
            }),
        )
        const newDataset: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: {} }],
        }
        const state = reducer(
            prev,
            setData({
                id: "s1",
                dataset: newDataset,
                meta: { columns: {}, pointsCount: 1, linesCount: 0, polygonsCount: 0 },
            }),
        )
        expect((state.items.s1 as any).dataset).toEqual(newDataset)
        expect(state.items.s1.pending).toBe(false)
    })

    test("select sets selectedId", () => {
        const prev = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "My Source",
                location: "file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        const state = reducer(prev, select("s1"))
        expect(state.selectedId).toBe("s1")
    })

    test("removeSource clears selectedId when it matches", () => {
        let state = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "My Source",
                location: "file.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        state = reducer(state, select("s1"))
        state = reducer(state, removeSource("s1"))
        expect(state.selectedId).toBeUndefined()
    })

    test("removeSource does not clear selectedId when it does not match", () => {
        let state = reducer(
            undefined,
            addGeojsonSource({
                id: "s1",
                name: "Source 1",
                location: "file1.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        state = reducer(
            state,
            addGeojsonSource({
                id: "s2",
                name: "Source 2",
                location: "file2.geojson",
                meta: { columns: {}, pointsCount: 0, linesCount: 0, polygonsCount: 0 },
            }),
        )
        state = reducer(state, select("s1"))
        state = reducer(state, removeSource("s2"))
        expect(state.selectedId).toBe("s1")
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

    test("selectSelectedId returns undefined initially", () => {
        const sourceState = { items: {}, allIds: [], selectedId: undefined }
        expect(selectSelectedId(makeRootState(sourceState))).toBeUndefined()
    })

    test("selectSelectedId returns the selected id", () => {
        const sourceState = { items: {}, allIds: [], selectedId: "s1" }
        expect(selectSelectedId(makeRootState(sourceState))).toBe("s1")
    })
})

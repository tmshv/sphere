import { configureStore } from "@reduxjs/toolkit"
import type { TileJSON } from "@/types/tilejson"
import { describe, expect, test } from "vitest"
import sourceReducer, { sourceSlice } from "../source"
import terrainReducer, { terrainSlice } from "../terrain"
import listener from "./resolve-terrain-source"

function makeStore() {
    return configureStore({
        reducer: { source: sourceReducer, terrain: terrainReducer },
        middleware: getDefault => getDefault().prepend(listener.middleware),
    })
}

const TILEJSON: TileJSON = {
    tilejson: "3.0.0",
    tiles: [],
    attribution: null,
    description: null,
    legend: null,
    name: null,
    template: null,
}

type TestStore = ReturnType<typeof makeStore>

function addDem(store: TestStore, id: string) {
    store.dispatch(
        sourceSlice.actions.addMVTSource({
            id,
            name: `DEM ${id}`,
            location: `/path/to/${id}.mbtiles`,
            tilejson: TILEJSON,
            format: "png",
        }),
    )
}

function addVector(store: TestStore, id: string) {
    store.dispatch(
        sourceSlice.actions.addMVTSource({
            id,
            name: `Vector ${id}`,
            location: `/path/to/${id}.mbtiles`,
            tilejson: TILEJSON,
            format: "pbf",
        }),
    )
}

describe("resolveTerrainSource", () => {
    test("the first elevation source becomes current without showing terrain", () => {
        const store = makeStore()
        addDem(store, "a")
        expect(store.getState().terrain.sourceId).toBe("a")
        expect(store.getState().terrain.show).toBe(false)
    })

    test("a source that is not elevation data is ignored", () => {
        const store = makeStore()
        addVector(store, "v")
        expect(store.getState().terrain.sourceId).toBeUndefined()
    })

    test("a second elevation source leaves the current one", () => {
        const store = makeStore()
        addDem(store, "a")
        addDem(store, "b")
        expect(store.getState().terrain.sourceId).toBe("a")
    })

    test("removing the current source falls back to the most recently added one", () => {
        const store = makeStore()
        addDem(store, "a")
        addDem(store, "b")
        addDem(store, "c")
        store.dispatch(sourceSlice.actions.removeSource("a"))
        expect(store.getState().terrain.sourceId).toBe("c")
    })

    test("removing the last source clears it and keeps show and hillshade", () => {
        const store = makeStore()
        addDem(store, "a")
        store.dispatch(terrainSlice.actions.enableFor("a"))
        store.dispatch(sourceSlice.actions.removeSource("a"))
        const state = store.getState().terrain
        expect(state.sourceId).toBeUndefined()
        expect(state.show).toBe(true)
        expect(state.hillshade).toBe(true)
    })

    test("adding a source afterwards makes it current and keeps show", () => {
        const store = makeStore()
        addDem(store, "a")
        store.dispatch(terrainSlice.actions.enableFor("a"))
        store.dispatch(sourceSlice.actions.removeSource("a"))
        addDem(store, "b")
        const state = store.getState().terrain
        expect(state.sourceId).toBe("b")
        expect(state.show).toBe(true)
        expect(state.hillshade).toBe(true)
    })
})

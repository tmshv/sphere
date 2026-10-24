import type { TileJSON } from "@/types/tilejson"
import { type Middleware, type UnknownAction, configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("@tauri-apps/plugin-dialog", () => ({
    open: vi.fn().mockResolvedValue(null),
}))

vi.mock("@tauri-apps/api/event", () => ({
    emit: vi.fn(),
    listen: vi.fn(),
    once: vi.fn(),
}))

vi.mock("@tauri-apps/api/webviewWindow", () => ({
    WebviewWindow: { getByLabel: vi.fn().mockResolvedValue(null) },
}))

vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn().mockResolvedValue(""),
}))

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
    writeText: vi.fn(),
}))

import app from "../app"
import layer, { actions as layerActions } from "../layer"
import selection, { copySelection, selectionSlice } from "../selection"
import sky from "../sky"
import sourceReducer, { actions as sourceActions } from "../source"
import terrain from "../terrain"
import tileBoundaries from "../tile-boundaries"
import { menuTrigger } from "../menu"
import menu from "./menu"

const LAYER_ID = "layer-1"
const SOURCE_ID = "source-1"

const MVT_ID = "mvt-1"
const ROADS_NODE_ID = `${MVT_ID}/roads`
const FOLDER_ID = "folder-1"

const meta = {
    columns: {},
    pointsCount: 0,
    multiPointsCount: 0,
    linesCount: 0,
    multiLinesCount: 0,
    polygonsCount: 0,
    multiPolygonsCount: 0,
    collectionsCount: 0,
    nullGeometryCount: 0,
    featuresCount: 0,
}

const tilejson: TileJSON = {
    tilejson: "3.0.0",
    tiles: [],
    vector_layers: [],
    attribution: null,
    description: null,
    legend: null,
    template: null,
    name: null,
}

const addSource = sourceActions.addInMemorySource({ id: SOURCE_ID, name: "Source", location: "sphere://source", meta })
const addVectorMvt = sourceActions.addMVTSource({
    id: MVT_ID,
    name: "Tiles",
    location: "tiles.mbtiles",
    tilejson,
    format: "pbf",
    sourceLayers: [{ id: "roads", name: "Roads" }],
})
const addFolder = sourceActions.addFolder({ id: FOLDER_ID, name: "Folder" })

let dispatched: UnknownAction[] = []

const capture: Middleware = () => next => action => {
    dispatched.push(action as UnknownAction)
    return next(action)
}

function makeStore() {
    return configureStore({
        reducer: { app, source: sourceReducer, layer, selection, terrain, sky, tileBoundaries },
        middleware: gDM => gDM().prepend(menu.middleware).concat(capture),
    })
}

function dispatchedTypes() {
    return dispatched.map(action => action.type)
}

describe("menu listener", () => {
    let store: ReturnType<typeof makeStore>

    beforeEach(() => {
        dispatched = []
        store = makeStore()
        store.dispatch(addSource)
        store.dispatch(addVectorMvt)
        store.dispatch(addFolder)
        dispatched = []
    })

    test("toggles zen mode", () => {
        store.dispatch(menuTrigger("view.toggle-zen-mode"))

        expect(store.getState().app.zenMode).toBe(true)
    })

    test("toggles the left sidebar", () => {
        store.dispatch(menuTrigger("view.toggle-left-sidebar"))

        expect(store.getState().app.showLeftSidebar).toBe(false)
    })

    test("toggles terrain", () => {
        store.dispatch(menuTrigger("view.toggle-terrain"))

        expect(store.getState().terrain.show).toBe(true)
    })

    test("toggles tile boundaries", () => {
        store.dispatch(menuTrigger("view.toggle-tile-boundaries"))

        expect(store.getState().tileBoundaries.value).toBe(true)
    })

    test("zooms to the selected source", () => {
        store.dispatch(sourceActions.select(SOURCE_ID))
        dispatched = []

        store.dispatch(menuTrigger("source.zoom-to"))

        expect(dispatched).toContainEqual(sourceActions.zoomTo(SOURCE_ID))
    })

    test("zooms to a selected source-layer node by its node id", () => {
        store.dispatch(sourceActions.select(ROADS_NODE_ID))
        dispatched = []

        store.dispatch(menuTrigger("source.zoom-to"))

        expect(dispatched).toContainEqual(sourceActions.zoomTo(ROADS_NODE_ID))
    })

    test("does not zoom when a folder is selected", () => {
        store.dispatch(sourceActions.select(FOLDER_ID))
        dispatched = []

        store.dispatch(menuTrigger("source.zoom-to"))

        expect(dispatchedTypes()).not.toContain("source/zoomTo")
    })

    test("adds a blank layer for a selected source-layer node by its node id", () => {
        store.dispatch(sourceActions.select(ROADS_NODE_ID))
        dispatched = []

        store.dispatch(menuTrigger("layer.add-blank"))

        expect(dispatched).toContainEqual(layerActions.addBlankLayer(ROADS_NODE_ID))
    })

    test("does not add a blank layer when a folder is selected", () => {
        store.dispatch(sourceActions.select(FOLDER_ID))
        dispatched = []

        store.dispatch(menuTrigger("layer.add-blank"))

        expect(dispatchedTypes()).not.toContain("layer/addBlankLayer")
    })

    test("does not remove the parent source when a source-layer node is selected", () => {
        store.dispatch(sourceActions.select(ROADS_NODE_ID))

        store.dispatch(menuTrigger("source.remove"))

        expect(store.getState().source.items[MVT_ID]).toBeDefined()
        expect(store.getState().source.nodes[ROADS_NODE_ID]).toBeDefined()
    })

    test("dispatches nothing for remove when a source-layer node is selected", () => {
        store.dispatch(sourceActions.select(ROADS_NODE_ID))
        dispatched = []

        store.dispatch(menuTrigger("source.remove"))

        expect(dispatchedTypes()).toEqual(["menu/trigger"])
    })

    test("removes a selected root folder", () => {
        store.dispatch(sourceActions.select(FOLDER_ID))
        dispatched = []

        store.dispatch(menuTrigger("source.remove"))

        expect(dispatched).toContainEqual(sourceActions.removeSource(FOLDER_ID))
    })

    test("shows properties for a selected source with a feature store", () => {
        store.dispatch(sourceActions.select(SOURCE_ID))
        dispatched = []

        store.dispatch(menuTrigger("source.show-properties"))

        expect(dispatchedTypes()).toContain("source/showProperties/pending")
    })

    test.each([
        { kind: "a source-layer node", nodeId: ROADS_NODE_ID },
        { kind: "an MVT source", nodeId: MVT_ID },
        { kind: "a folder", nodeId: FOLDER_ID },
    ])("does not show properties when $kind is selected", ({ nodeId }) => {
        store.dispatch(sourceActions.select(nodeId))
        dispatched = []

        store.dispatch(menuTrigger("source.show-properties"))

        expect(dispatchedTypes()).not.toContain("source/showProperties/pending")
    })

    test("does not zoom when no source is selected", () => {
        store.dispatch(menuTrigger("source.zoom-to"))

        expect(dispatchedTypes()).not.toContain("source/zoomTo")
    })

    test("adds a blank layer for the selected source", () => {
        store.dispatch(sourceActions.select(SOURCE_ID))
        dispatched = []

        store.dispatch(menuTrigger("layer.add-blank"))

        expect(dispatched).toContainEqual(layerActions.addBlankLayer(SOURCE_ID))
    })

    test("deletes the selected layer", () => {
        store.dispatch(
            layerActions.addLayer({
                id: LAYER_ID,
                fractionIndex: 0.5,
                visible: true,
                name: "Layer",
                color: "#ff0000",
            }),
        )
        store.dispatch(layerActions.select(LAYER_ID))

        store.dispatch(menuTrigger("layer.delete"))

        expect(store.getState().layer.allIds).not.toContain(LAYER_ID)
    })

    test("does not delete when no layer is selected", () => {
        store.dispatch(menuTrigger("layer.delete"))

        expect(dispatchedTypes()).not.toContain("layer/removeLayer")
    })

    test("copies the selection as GeoJSON", () => {
        store.dispatch(selectionSlice.actions.sync({ count: 2, sourceId: SOURCE_ID }))
        dispatched = []

        store.dispatch(menuTrigger("edit.copy-selection-geojson"))

        expect(dispatched).toContainEqual(copySelection("geojson"))
    })

    test("copies the selection as WKT", () => {
        store.dispatch(selectionSlice.actions.sync({ count: 2, sourceId: SOURCE_ID }))
        dispatched = []

        store.dispatch(menuTrigger("edit.copy-selection-wkt"))

        expect(dispatched).toContainEqual(copySelection("wkt"))
    })

    test("does not copy when nothing is selected", () => {
        store.dispatch(menuTrigger("edit.copy-selection-geojson"))

        expect(dispatchedTypes()).not.toContain("selection/copy")
    })

    test("ignores an unknown menu id", () => {
        expect(() => store.dispatch(menuTrigger("nope.not-a-real-item"))).not.toThrow()
    })

    test("opens files", () => {
        store.dispatch(menuTrigger("file.open"))

        expect(dispatchedTypes()).toContain("openFiles/pending")
    })

    test("toggles dark theme", () => {
        store.dispatch(menuTrigger("view.toggle-dark-theme"))

        expect(store.getState().app.darkTheme).toBe(true)
    })

    test("toggles the right sidebar", () => {
        store.dispatch(menuTrigger("view.toggle-right-sidebar"))

        expect(store.getState().app.showRightSidebar).toBe(false)
    })

    test("removes the selected source", () => {
        store.dispatch(sourceActions.select(SOURCE_ID))
        dispatched = []

        store.dispatch(menuTrigger("source.remove"))

        expect(dispatched).toContainEqual(sourceActions.removeSource(SOURCE_ID))
    })

    test("keeps app state untouched for an unknown id", () => {
        const before = store.getState().app

        store.dispatch(menuTrigger("view.toggle-nothing"))

        expect(store.getState().app).toEqual(before)
    })

    test("toggling the sidebar twice returns it to its original state", () => {
        store.dispatch(menuTrigger("view.toggle-left-sidebar"))
        store.dispatch(menuTrigger("view.toggle-left-sidebar"))

        expect(store.getState().app.showLeftSidebar).toBe(true)
    })
})

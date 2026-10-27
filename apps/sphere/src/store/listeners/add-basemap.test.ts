import { BASEMAPS } from "@/const"
import { makeCaptureStore } from "@/testutils"
import { LayerType } from "@/types"
import { describe, expect, test, vi } from "vitest"

vi.mock("@/lib/nextId", () => ({
    nextId: vi.fn((prefix: string) => `${prefix}-1`),
}))

vi.mock("@sphere/utils", () => ({
    nextColor: vi.fn(() => "#aabbcc"),
}))

import { actions } from "../actions"
import listener from "./add-basemap"

function makeStore(layerItems: Record<string, { fractionIndex: number }> = {}) {
    return makeCaptureStore({
        preloadedState: { layer: { items: layerItems, allIds: Object.keys(layerItems) } },
        middleware: listener.middleware,
    })
}

async function settle() {
    await new Promise(resolve => setTimeout(resolve, 0))
}

describe("add-basemap listener", () => {
    test("adds the basemap as a raster source with its XYZ tiles", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addBasemap("osm"))
        await settle()

        const added = dispatched.find(action => action.type === actions.source.addRasterSource.type)
        expect(added?.payload).toEqual({
            id: "basemap-1",
            name: BASEMAPS.osm.name,
            location: BASEMAPS.osm.location,
            tiles: BASEMAPS.osm.tiles,
        })
    })

    test("adds a visible raster layer bound to the new source", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addBasemap("sentinel2-2016"))
        await settle()

        const layer = dispatched.find(action => action.type === actions.layer.addLayer.type)
        expect(layer?.payload).toMatchObject({
            id: "layer-1",
            sourceId: "basemap-1",
            name: BASEMAPS["sentinel2-2016"].name,
            type: LayerType.Raster,
            visible: true,
        })
    })

    test("places the layer below every existing layer", async () => {
        const { store, dispatched } = makeStore({ a: { fractionIndex: 0.5 }, b: { fractionIndex: 0.2 } })
        store.dispatch(actions.source.addBasemap("osm"))
        await settle()

        const layer = dispatched.find(action => action.type === actions.layer.addLayer.type)
        expect(layer?.payload).toMatchObject({ fractionIndex: -0.8 })
    })

    test("leaves the sidebar tab and selection alone", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addBasemap("osm"))
        await settle()

        const types = dispatched.map(action => action.type)
        expect(types).not.toContain(actions.app.setActiveSidebarTab.type)
        expect(types).not.toContain(actions.layer.select.type)
        expect(types).not.toContain(actions.source.select.type)
    })
})

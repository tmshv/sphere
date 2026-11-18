import { TEMPLATE_ERRORS } from "@/lib/raster-template"
import { makeCaptureStore } from "@/testutils"
import { LayerType, type Projection } from "@/types"
import { describe, expect, test, vi } from "vitest"

vi.mock("@/lib/nextId", () => ({
    nextId: vi.fn((prefix: string) => `${prefix}-1`),
}))

vi.mock("@sphere/utils", () => ({
    nextColor: vi.fn(() => "#aabbcc"),
}))

import { actions } from "../actions"
import listener from "./add-raster-url"

const WMS =
    "https://wms.example.org/service?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=topomap&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=512&HEIGHT=512&FORMAT=image/png"
const XYZ = "https://tile.example.org/{z}/{x}/{y}.png"

function makeStore(layerItems: Record<string, { fractionIndex: number }> = {}, projection: Projection = "mercator") {
    return makeCaptureStore({
        preloadedState: {
            layer: { items: layerItems, allIds: Object.keys(layerItems) },
            projection: { value: projection },
        },
        middleware: listener.middleware,
    })
}

async function settle() {
    await new Promise(resolve => setTimeout(resolve, 0))
}

describe("add-raster-url listener", () => {
    test("adds a WMS template as a raster source named after host and layers", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addRasterFromUrl({ template: WMS }))
        await settle()

        const added = dispatched.find(action => action.type === actions.source.addRasterSource.type)
        expect(added?.payload).toEqual({
            id: "raster-1",
            name: "wms.example.org/topomap",
            location: WMS,
            tiles: { urls: [WMS], tileSize: 512, maxzoom: 22, attribution: "" },
        })
    })

    test("adds a raster layer bound to the new source, below every existing layer", async () => {
        const { store, dispatched } = makeStore({ a: { fractionIndex: 0.5 }, b: { fractionIndex: 0.2 } })
        store.dispatch(actions.source.addRasterFromUrl({ template: XYZ }))
        await settle()

        const layer = dispatched.find(action => action.type === actions.layer.addLayer.type)
        expect(layer?.payload).toMatchObject({
            id: "layer-1",
            sourceId: "raster-1",
            name: "tile.example.org",
            type: LayerType.Raster,
            visible: true,
            fractionIndex: -0.8,
        })
    })

    test("uses the given name instead of the derived one", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addRasterFromUrl({ template: XYZ, name: "  My tiles  " }))
        await settle()

        const added = dispatched.find(action => action.type === actions.source.addRasterSource.type)
        expect(added?.payload).toMatchObject({ name: "My tiles" })
    })

    test("falls back to the derived name when the given one is blank", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addRasterFromUrl({ template: XYZ, name: "   " }))
        await settle()

        const added = dispatched.find(action => action.type === actions.source.addRasterSource.type)
        expect(added?.payload).toMatchObject({ name: "tile.example.org" })
    })

    test("accepts Web Mercator templates under the globe projection", async () => {
        const { store, dispatched } = makeStore({}, "globe")
        store.dispatch(actions.source.addRasterFromUrl({ template: WMS }))
        await settle()

        const types = dispatched.map(action => action.type)
        expect(types).toContain(actions.source.addRasterSource.type)
    })

    test("reports an invalid template as an error and adds nothing", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addRasterFromUrl({ template: "https://tile.example.org/tile.png" }))
        await settle()

        const error = dispatched.find(action => action.type === actions.error.setError.type)
        expect(error?.payload).toBe(TEMPLATE_ERRORS.noToken)
        const types = dispatched.map(action => action.type)
        expect(types).not.toContain(actions.source.addRasterSource.type)
        expect(types).not.toContain(actions.layer.addLayer.type)
    })
})

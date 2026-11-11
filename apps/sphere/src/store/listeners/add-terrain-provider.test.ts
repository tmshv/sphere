import { TERRAIN_PROVIDERS } from "@/const"
import { makeCaptureStore } from "@/testutils"
import { SourceType } from "@/types"
import { describe, expect, test } from "vitest"
import { actions } from "../actions"
import sourceReducer, { sourceSlice } from "../source"
import listener from "./add-terrain-provider"

function makeStore(withCandidate = false) {
    const source = withCandidate
        ? sourceReducer(
              undefined,
              sourceSlice.actions.addRasterSource({
                  id: "existing",
                  name: "Existing DEM",
                  location: "/dem",
                  dem: "terrarium",
              }),
          )
        : sourceReducer(undefined, { type: "init" })
    return makeCaptureStore({ preloadedState: { source }, middleware: listener.middleware })
}

async function settle() {
    await new Promise(resolve => setTimeout(resolve, 0))
}

describe("add-terrain-provider listener", () => {
    test("adds one DEM raster source with the Mapterhorn tiles and no layer", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addTerrainProvider("mapterhorn"))
        await settle()

        const added = dispatched.filter(action => action.type === actions.source.addRasterSource.type)
        expect(added).toHaveLength(1)
        expect(added[0].payload).toEqual({
            id: expect.stringMatching(/^terrain/),
            name: TERRAIN_PROVIDERS.mapterhorn.name,
            location: TERRAIN_PROVIDERS.mapterhorn.location,
            tiles: TERRAIN_PROVIDERS.mapterhorn.tiles,
            dem: "terrarium",
        })
        expect(TERRAIN_PROVIDERS.mapterhorn.tiles).toMatchObject({
            urls: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"],
            tileSize: 512,
        })
        expect(dispatched.map(action => action.type)).not.toContain(actions.layer.addLayer.type)
    })

    test("the added source is a raster source with the DEM encoding", () => {
        const state = sourceReducer(
            undefined,
            sourceSlice.actions.addRasterSource({
                id: "t",
                ...TERRAIN_PROVIDERS.mapterhorn,
            }),
        )
        expect(state.items.t).toMatchObject({ type: SourceType.Raster, dem: "terrarium" })
    })

    test("on an empty project enables terrain and hillshade for the new source", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addTerrainProvider("mapterhorn"))
        await settle()

        const added = dispatched.find(action => action.type === actions.source.addRasterSource.type)
        const enabled = dispatched.filter(action => action.type === actions.terrain.enableFor.type)
        expect(enabled).toHaveLength(1)
        expect(enabled[0].payload).toBe(
            typeof added?.payload === "object" && added.payload && "id" in added.payload ? added.payload.id : undefined,
        )
    })

    test("leaves the terrain slice alone when a candidate already exists", async () => {
        const { store, dispatched } = makeStore(true)
        store.dispatch(actions.source.addTerrainProvider("mapterhorn"))
        await settle()

        const types = dispatched.map(action => action.type)
        expect(types).toContain(actions.source.addRasterSource.type)
        expect(types.filter(type => type.startsWith("terrain/"))).toEqual([])
    })

    test("a second call adds a second source", async () => {
        const { store, dispatched } = makeStore()
        store.dispatch(actions.source.addTerrainProvider("mapterhorn"))
        store.dispatch(actions.source.addTerrainProvider("mapterhorn"))
        await settle()

        const added = dispatched.filter(action => action.type === actions.source.addRasterSource.type)
        expect(added).toHaveLength(2)
    })
})

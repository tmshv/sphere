import { TERRAIN_PROVIDERS } from "@/const"
import { nextId } from "@/lib/nextId"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectHasTerrainSource } from "../terrain"

const listener = createListenerMiddleware<RootState>()
listener.startListening({
    actionCreator: actions.source.addTerrainProvider,
    effect: async (action, listenerApi) => {
        const { name, location, tiles, dem } = TERRAIN_PROVIDERS[action.payload]
        // Read before adding: only the first elevation source switches terrain on
        const hadTerrainSource = selectHasTerrainSource(listenerApi.getState())
        const sourceId = nextId("terrain")
        listenerApi.dispatch(actions.source.addRasterSource({ id: sourceId, name, location, tiles, dem }))
        // Hidden in the Sources tree: elevation tiles drawn as a raster are noise. Terrain ignores tree visibility,
        // so the source still drives terrain and hillshade.
        listenerApi.dispatch(actions.source.setVisible({ id: sourceId, value: false }))
        if (!hadTerrainSource) {
            listenerApi.dispatch(actions.terrain.enableFor(sourceId))
        }
    },
})

export default listener

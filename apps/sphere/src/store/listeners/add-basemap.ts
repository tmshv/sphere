import { BASEMAPS } from "@/const"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { addRasterWithLayer } from "./add-raster-with-layer"

const listener = createListenerMiddleware<RootState>()
listener.startListening({
    actionCreator: actions.source.addBasemap,
    effect: async (action, listenerApi) => {
        const { name, location, tiles } = BASEMAPS[action.payload]
        addRasterWithLayer(listenerApi, { idPrefix: "basemap", name, location, tiles })
    },
})

export default listener

import { parseRasterTemplate } from "@/lib/raster-template"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectProjectionCrs } from "../projection"
import { addRasterWithLayer } from "./add-raster-with-layer"

const listener = createListenerMiddleware<RootState>()
listener.startListening({
    actionCreator: actions.source.addRasterFromUrl,
    effect: async (action, listenerApi) => {
        const { template, name } = action.payload
        // Checked again against the projection at the time of adding, which may differ from the dialog's
        const crs = selectProjectionCrs(listenerApi.getState())
        const result = parseRasterTemplate(template, crs)
        if ("error" in result) {
            listenerApi.dispatch(actions.error.setError(result.error))
            return
        }

        addRasterWithLayer(listenerApi, {
            idPrefix: "raster",
            name: name?.trim() || result.name,
            location: template.trim(),
            tiles: result.tiles,
        })
    },
})

export default listener

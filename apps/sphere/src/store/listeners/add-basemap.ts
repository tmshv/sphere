import { nextColor } from "@sphere/utils"
import { BASEMAPS } from "@/const"
import { fractionsBetween } from "@/lib/fraction-index"
import { nextId } from "@/lib/nextId"
import { LayerType } from "@/types"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware<RootState>()
listener.startListening({
    actionCreator: actions.source.addBasemap,
    effect: async (action, listenerApi) => {
        const { name, location, tiles } = BASEMAPS[action.payload]
        const sourceId = nextId("basemap")
        listenerApi.dispatch(actions.source.addRasterSource({ id: sourceId, name, location, tiles }))

        // A basemap draws under every existing layer
        const { items } = listenerApi.getState().layer
        const lowest = Object.values(items).reduce<number | undefined>(
            (min, layer) => (min === undefined ? layer.fractionIndex : Math.min(min, layer.fractionIndex)),
            undefined,
        )
        const fractionIndex = fractionsBetween(undefined, lowest, 1).at(0) ?? 0
        listenerApi.dispatch(
            actions.layer.addLayer({
                id: nextId("layer"),
                sourceId,
                name,
                type: LayerType.Raster,
                visible: true,
                fractionIndex,
                color: nextColor(),
            }),
        )
    },
})

export default listener

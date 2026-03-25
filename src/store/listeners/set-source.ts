import { LayerType, SourceType } from "@/types"
import { isRasterTileFormat } from "@/types/tilejson"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.layer.setSource,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        const { id: layerId, sourceId } = action.payload
        const source = state.source.items[sourceId]
        const layer = state.layer.items[layerId]

        if (!source || !layer) {
            return
        }

        const isRaster =
            (source.type === SourceType.MVT && isRasterTileFormat(source.format)) || source.type === SourceType.Raster

        if (isRaster) {
            listenerApi.dispatch(actions.layer.setType({ id: layerId, type: LayerType.Raster }))
            listenerApi.dispatch(actions.layer.setLayerFilter({ id: layerId, expression: null }))
        } else if (layer.type === LayerType.Raster) {
            listenerApi.dispatch(actions.layer.setType({ id: layerId, type: LayerType.Point }))
        }
    },
})

export default listener

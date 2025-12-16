import { createListenerMiddleware } from "@reduxjs/toolkit"
import { actions } from "../actions"
import logger from "@/logger"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.source.addFromUrl.fulfilled,
    effect: async action => {
        logger.info({ action }, "Source was added")
        // const { sourceId, name, meta } = action.payload
        //
        // const layerType = predictLayerType(meta)
        // if (!layerType) {
        //     return
        // }
        //
        // const layerId = nextId("layer")
        // listenerApi.dispatch(actions.layer.addLayer({
        //     id: layerId,
        //     sourceId,
        //     fractionIndex: Math.random(),
        //     visible: true,
        //     name: name,
        //     color: "#1c7ed6",
        // }))
        // listenerApi.dispatch(actions.layer.setType({
        //     id: layerId,
        //     type: layerType,
        // }))
    },
})

export default listener

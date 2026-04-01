import { createListenerMiddleware } from "@reduxjs/toolkit"
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.app.setMapTool,
    effect: (action, listenerApi) => {
        switch (action.payload) {
            case "pan": {
                listenerApi.dispatch(actions.mapInteraction.setDragPan(true))
                listenerApi.dispatch(actions.mapInteraction.setScrollZoom(true))
                listenerApi.dispatch(actions.mapInteraction.setDragRotate(true))
                break
            }
            case "select": {
                listenerApi.dispatch(actions.mapInteraction.setDragPan(false))
                listenerApi.dispatch(actions.mapInteraction.setDragRotate(false))
                break
            }
        }
    },
})

export default listener

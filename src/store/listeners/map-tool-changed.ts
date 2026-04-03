import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
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

// Reset to pan when leaving Sources tab
listener.startListening({
    actionCreator: actions.app.setActiveSidebarTab,
    effect: (action, listenerApi) => {
        if (action.payload !== "sources") {
            const state = listenerApi.getState() as RootState
            if (state.app.mapTool !== "pan") {
                listenerApi.dispatch(actions.app.setMapTool("pan"))
            }
        }
    },
})

export default listener

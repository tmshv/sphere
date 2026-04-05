import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { DEFAULT_MAP_TOOL } from "@/lib/map-tools"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.app.setMapTool,
    effect: (action, listenerApi) => {
        switch (action.payload) {
            case "navigation": {
                listenerApi.dispatch(actions.mapInteraction.setDragPan(true))
                listenerApi.dispatch(actions.mapInteraction.setScrollZoom(true))
                listenerApi.dispatch(actions.mapInteraction.setDragRotate(true))
                break
            }
            case "select":
            case "info": {
                listenerApi.dispatch(actions.mapInteraction.setDragPan(false))
                listenerApi.dispatch(actions.mapInteraction.setDragRotate(false))
                break
            }
        }
    },
})

// Reset to navigation when entering draw mode so RectSelectOverlay unmounts
listener.startListening({
    actionCreator: actions.tools.setTool,
    effect: (action, listenerApi) => {
        if (action.payload === "draw") {
            const state = listenerApi.getState() as RootState
            if (state.app.mapTool !== DEFAULT_MAP_TOOL) {
                listenerApi.dispatch(actions.app.setMapTool(DEFAULT_MAP_TOOL))
            }
        }
    },
})

export default listener

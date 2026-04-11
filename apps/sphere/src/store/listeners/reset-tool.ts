import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.tools.reset,
    effect: (_, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        if (state.tools.activeTool === "draw") {
            listenerApi.dispatch(actions.draw.reset())
        }
    },
})

export default listener

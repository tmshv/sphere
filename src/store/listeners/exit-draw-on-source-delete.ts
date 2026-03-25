import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.source.removeSource,
    effect: (action, listenerApi) => {
        const state = listenerApi.getOriginalState() as RootState
        if (state.draw.sourceId === action.payload) {
            listenerApi.dispatch(actions.tools.reset())
        }
    },
})

export default listener

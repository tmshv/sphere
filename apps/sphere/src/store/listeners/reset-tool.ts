import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware<RootState>()

// Leaving the draw tool any way other than Done discards the edits: route it through Cancel,
// so the backend session is rolled back. A commit or cancel already in flight ends the session itself
listener.startListening({
    actionCreator: actions.tools.reset,
    effect: (_, listenerApi) => {
        const { sourceId, pending } = listenerApi.getOriginalState().draw
        if (sourceId === undefined || pending) {
            return
        }
        listenerApi.dispatch(actions.draw.cancel({ sourceId }))
    },
})

export default listener

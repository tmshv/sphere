import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware<RootState>()

// Leaving the draw tool any way other than Done discards the edits: route it through Cancel,
// so the backend session is rolled back. A commit or cancel already in flight ends the session
// itself and is never cancelled here; if it fails and draw mode stays, the draw tool comes back
listener.startListening({
    actionCreator: actions.tools.reset,
    effect: async (_, listenerApi) => {
        const { sourceId, pending } = listenerApi.getOriginalState().draw
        if (sourceId === undefined) {
            return
        }
        if (!pending) {
            listenerApi.dispatch(actions.draw.cancel({ sourceId }))
            return
        }
        await listenerApi.condition((_, state) => !state.draw.pending)
        if (listenerApi.getState().draw.sourceId !== undefined) {
            listenerApi.dispatch(actions.tools.setTool("draw"))
        }
    },
})

export default listener

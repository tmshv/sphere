import { getDrawQueue } from "@/lib/draw-session"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { rollbackSession } from "./draw-session-end"

const listener = createListenerMiddleware<RootState>()

// Removing the drawn source (alone or with its folder) leaves draw mode at once and rolls the
// backend session back. Removal is frontend-only, so the backend source is still there to roll back
listener.startListening({
    actionCreator: actions.source.removeSource,
    effect: async (_, listenerApi) => {
        const before = listenerApi.getOriginalState().draw
        const sourceId = before.sourceId
        if (sourceId === undefined || sourceId in listenerApi.getState().source.items) {
            return
        }

        if (before.pending) {
            // A commit or cancel is already ending the session: let it finish, then end what it left open
            await listenerApi.condition((_, state) => !state.draw.pending)
            if (listenerApi.getState().draw.sourceId !== sourceId) {
                return
            }
        }

        // Taken before draw mode ends: the draw UI unregisters its queue when it unmounts
        const queue = getDrawQueue(sourceId)
        listenerApi.dispatch(actions.draw.reset())
        listenerApi.dispatch(actions.tools.reset())
        await rollbackSession(listenerApi, sourceId, queue)
    },
})

export default listener

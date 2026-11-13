import { beginDraw } from "@/lib/draw-session"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { surfaceError } from "./draw-session-end"

const BEGIN_FAILED = "Cannot edit this source"

const listener = createListenerMiddleware<RootState>()

// Draw mode is entered only once the backend session has begun; a source that cannot be edited fails closed
listener.startListening({
    actionCreator: actions.draw.start,
    effect: async (action, listenerApi) => {
        const before = listenerApi.getOriginalState().draw
        if (before.sourceId !== undefined || before.pending) {
            return
        }

        const { sourceId } = action.payload
        try {
            await beginDraw(sourceId)
        } catch (err) {
            surfaceError(listenerApi, BEGIN_FAILED, err)
            listenerApi.dispatch(actions.draw.settle())
            return
        }

        listenerApi.dispatch(actions.draw.started({ sourceId }))
        listenerApi.dispatch(actions.tools.setTool("draw"))
    },
})

export default listener

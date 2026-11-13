import { commitDraw, getDrawQueue } from "@/lib/draw-session"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { refreshSelection, rollbackSession, surfaceError } from "./draw-session-end"

const EDITS_NOT_SAVED = "Draw edits could not be saved, cancel to discard them"
const COMMIT_FAILED = "Could not save the draw edits"
const DRAW_FAILED = "Draw failed"

const listener = createListenerMiddleware<RootState>()

// Done: send every queued op, then keep the edits. Any failure keeps draw mode, so the user can Cancel
listener.startListening({
    actionCreator: actions.draw.commit,
    effect: async (action, listenerApi) => {
        const { sourceId } = action.payload
        const before = listenerApi.getOriginalState().draw
        if (before.sourceId !== sourceId || before.pending) {
            return
        }

        const flushed = await getDrawQueue(sourceId)?.flush()
        if (flushed && !flushed.ok) {
            surfaceError(listenerApi, EDITS_NOT_SAVED, flushed.error)
            listenerApi.dispatch(actions.draw.settle())
            return
        }

        let touched: number[]
        try {
            touched = await commitDraw(sourceId)
        } catch (err) {
            surfaceError(listenerApi, COMMIT_FAILED, err)
            listenerApi.dispatch(actions.draw.settle())
            return
        }

        // A commit that touched nothing left the source as the map already shows it
        if (touched.length > 0) {
            listenerApi.dispatch(actions.source.bumpVersion(sourceId))
        }
        await refreshSelection(listenerApi, sourceId)
        listenerApi.dispatch(actions.draw.done({ sourceId }))
        listenerApi.dispatch(actions.tools.reset())
    },
})

// Cancel: discard the edits. A failed rollback keeps draw mode, so the user can retry
listener.startListening({
    actionCreator: actions.draw.cancel,
    effect: async (action, listenerApi) => {
        const { sourceId } = action.payload
        const before = listenerApi.getOriginalState().draw
        if (before.sourceId !== sourceId || before.pending) {
            return
        }

        const rolledBack = await rollbackSession(listenerApi, sourceId, getDrawQueue(sourceId))
        if (!rolledBack) {
            listenerApi.dispatch(actions.draw.settle())
            return
        }
        // Draw mode ends first, so the tool reset below does not cancel again
        listenerApi.dispatch(actions.draw.reset())
        listenerApi.dispatch(actions.tools.reset())
    },
})

listener.startListening({
    actionCreator: actions.draw.failed,
    effect: (action, listenerApi) => {
        surfaceError(listenerApi, DRAW_FAILED, action.payload)
    },
})

export default listener

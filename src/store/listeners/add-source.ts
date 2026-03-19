import logger from "@/logger"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

async function selectLastAdded(action: unknown, listenerApi: { getState: () => unknown; dispatch: (a: unknown) => void }) {
    logger.info({ action }, "Source was added")
    const state = listenerApi.getState() as RootState
    const sourceId = state.source.lastAdded
    if (sourceId) {
        listenerApi.dispatch(actions.selection.selectSource({ sourceId }))
    }
}

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.source.addFromUrl.fulfilled,
    effect: selectLastAdded,
})
listener.startListening({
    actionCreator: actions.source.addFromClipboard.fulfilled,
    effect: selectLastAdded,
})

export default listener

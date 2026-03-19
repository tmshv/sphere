import logger from "@/logger"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.source.addFromUrl.fulfilled,
    effect: async (action, listenerApi) => {
        logger.info({ action }, "Source was added")
        const state = listenerApi.getState() as RootState
        const sourceId = state.source.lastAdded
        if (sourceId) {
            listenerApi.dispatch(actions.selection.selectSource({ sourceId }))
        }
    },
})

export default listener

import logger from "@/logger"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import { invoke } from "@tauri-apps/api/core"
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.draw.commit,
    effect: async (action, listenerApi) => {
        const { sourceId, patch } = action.payload
        const hasChanges = patch.added.length > 0 || patch.updated.length > 0 || patch.deleted_ids.length > 0
        if (hasChanges) {
            try {
                await invoke("source_patch", { id: sourceId, patch })
            } catch (err) {
                logger.error("Failed to save draw source %s: %s", sourceId, err)
                return
            }
            listenerApi.dispatch(actions.source.bumpVersion(sourceId))
        }
        listenerApi.dispatch(actions.draw.done({ sourceId }))
        listenerApi.dispatch(actions.tools.reset())
    },
})

export default listener

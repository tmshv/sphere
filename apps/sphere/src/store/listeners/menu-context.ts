import { createListenerMiddleware } from "@reduxjs/toolkit"
import { invoke } from "@tauri-apps/api/core"
import logger from "@/logger"
import type { RootState } from ".."
import { sameMenuContext, selectMenuContext } from "../menu"

const listener = createListenerMiddleware()

// Watching the derived context rather than a list of actions means a new way of
// selecting a source or layer cannot forget to update the menu.
listener.startListening({
    predicate: (_, currentState, previousState) => {
        const current = selectMenuContext(currentState as RootState)
        const previous = selectMenuContext(previousState as RootState)

        return !sameMenuContext(current, previous)
    },
    effect: async (_, listenerApi) => {
        const context = selectMenuContext(listenerApi.getState() as RootState)

        try {
            await invoke("menu_set_context", { context })
        } catch (e) {
            logger.error(`Failed to update the native menu: ${e}`)
        }
    },
})

export default listener

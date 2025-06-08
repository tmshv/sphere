import { createListenerMiddleware } from "@reduxjs/toolkit"
import { getMap } from "@/map"
import { actions } from "../"
import type { RootState } from ".."

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.selection.reset,
    effect: async (_, listenerApi) => {
        const map = getMap("spheremap")
        if (!map) {
            return
        }
        const state = listenerApi.getOriginalState() as RootState
        const layerId = state.selection.layerId
        if (!layerId) {
            return
        }

        map.setFilter(`${layerId}-selected`, ["in", "id", ""])
    },
})

export default listener

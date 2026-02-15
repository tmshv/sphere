import { createListenerMiddleware } from "@reduxjs/toolkit"
import { getMap } from "@/map"
import { MAP_ID } from "@/const"
import { actions } from "../actions"
import type { RootState } from ".."

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.selection.reset,
    effect: async (_, listenerApi) => {
        const map = getMap(MAP_ID)
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

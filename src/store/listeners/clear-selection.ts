import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.selection.reset,
    effect: async (_, listenerApi) => {
        const map = getMap(MAP_ID)
        if (!map) {
            return
        }
        const state = listenerApi.getOriginalState() as RootState
        const layerId = state.layer.selectedId
        if (!layerId) {
            return
        }

        map.setFilter(`${layerId}-selected`, ["in", "id", ""])
    },
})

export default listener

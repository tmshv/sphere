import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    matcher: isAnyOf(actions.selection.reset, actions.selection.resetFeature),
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

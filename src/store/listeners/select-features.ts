import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.selection.selectOne,
    effect: async (action, listenerApi) => {
        const map = getMap(MAP_ID)
        if (!map) {
            return
        }

        const state = listenerApi.getOriginalState() as RootState
        const { featureId, layerId } = action.payload

        const prevLayerId = state.selection.layerId
        if (prevLayerId && layerId !== prevLayerId) {
            map.setFilter(`${prevLayerId}-selected`, ["in", "id", ""])
        }

        map.setFilter(`${layerId}-selected`, ["in", "id", ...[featureId]])
    },
})

export default listener

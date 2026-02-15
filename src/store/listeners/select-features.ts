import { createListenerMiddleware } from "@reduxjs/toolkit"
import { getMap } from "@/map"
import { MAP_ID } from "@/const"
import { actions } from "../actions"
import type { RootState } from ".."

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

        // const source = state.source.items[sourceId]
        // const f = source.data.data.find(f => f.id === featureId)
        // if (!f) {
        //     return
        // }

        // console.log("select!", featureId, sourceId);

        map.setFilter(`${layerId}-selected`, ["in", "id", ...[featureId]])

        // console.log(f.properties);
    },
})

export default listener

import { nextId } from "@/lib/nextId"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions, duplicate } from "../layer"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: duplicate,
    effect: async (action, listenerApi) => {
        const layerId = action.payload
        const state = listenerApi.getOriginalState() as RootState
        const layer = state.layer.items[layerId]

        listenerApi.dispatch(
            actions.addLayer({
                ...layer,
                fractionIndex: layer.fractionIndex + 0.00001,
                id: nextId("layer"),
                name: `${layer.name} copy`,
                visible: true,
            }),
        )
    },
})

export default listener

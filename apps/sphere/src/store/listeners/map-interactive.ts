import { getMap } from "@/map"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.map.setInteractive,
    effect: async action => {
        const { mapId, value } = action.payload
        const map = getMap(mapId)
        if (!map) {
            return
        }

        const element = map.getCanvasContainer()
        element.style.cursor = value ? "pointer" : ""
    },
})

export default listener

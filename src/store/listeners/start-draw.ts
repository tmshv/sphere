import { createListenerMiddleware } from "@reduxjs/toolkit"
import { actions } from "../actions"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.draw.start,
    effect: (_, listenerApi) => {
        listenerApi.dispatch(actions.tools.setTool("draw"))
    },
})

export default listener

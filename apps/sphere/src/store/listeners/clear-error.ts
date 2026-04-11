import { createListenerMiddleware } from "@reduxjs/toolkit"
import { actions } from "../error"

const listener = createListenerMiddleware()
listener.startListening({
    actionCreator: actions.setError,
    effect: async (_, listenerApi) => {
        await listenerApi.delay(3000)
        listenerApi.dispatch(actions.clear())
    },
})

export default listener

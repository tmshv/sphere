import { createListenerMiddleware } from "@reduxjs/toolkit"
import { addFromUrl } from "../source/addFromUrl"
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    // matcher: isAnyOf(
    //     actions.source.addFromUrl.rejected,
    // ),
    actionCreator: addFromUrl.rejected,
    effect: async (action, listenerApi) => {
        const msg = action.error.message ?? "Unknown error"
        listenerApi.dispatch(actions.error.setError(msg))
    },
})

export default listener

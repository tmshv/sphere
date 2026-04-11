import { createListenerMiddleware } from "@reduxjs/toolkit"
import { actions } from "../actions"
import addFromUrl from "../source/addFromUrl"

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

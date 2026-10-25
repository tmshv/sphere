import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectSelectedSourceRef } from "../source/tree-selectors"

const listener = createListenerMiddleware<RootState>()

// Feature selection belongs to one source (and source-layer); leaving it makes the selection meaningless
listener.startListening({
    predicate: action => actions.source.select.match(action) || actions.source.removeSource.match(action),
    effect: (_action, listenerApi) => {
        const before = selectSelectedSourceRef(listenerApi.getOriginalState())
        const state = listenerApi.getState()
        const after = selectSelectedSourceRef(state)
        const unchanged = before?.sourceId === after?.sourceId && before?.sourceLayer === after?.sourceLayer
        if (unchanged || state.selection.count === 0) return
        listenerApi.dispatch(actions.selection.reset())
    },
})

export default listener

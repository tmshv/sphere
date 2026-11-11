import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectTerrainCandidates } from "../terrain"

const listener = createListenerMiddleware()

// The id the terrain should point at, or undefined when there is no elevation source
function expectedSourceId(state: RootState) {
    return selectTerrainCandidates(state).at(-1)?.id
}

// The stored id is kept while it is still a candidate; otherwise it follows the
// most recently added one. Only `sourceId` changes, never `show` or `hillshade`.
function isStale(state: RootState) {
    const { sourceId } = state.terrain
    const candidates = selectTerrainCandidates(state)
    if (sourceId !== undefined && candidates.some(candidate => candidate.id === sourceId)) {
        return false
    }
    return sourceId !== expectedSourceId(state)
}

listener.startListening({
    predicate: (_, currentState) => isStale(currentState as RootState),
    effect: (_, listenerApi) => {
        listenerApi.dispatch(actions.terrain.setSource(expectedSourceId(listenerApi.getState() as RootState)))
    },
})

export default listener

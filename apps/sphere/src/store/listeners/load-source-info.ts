import { SourceReader } from "@/lib/source-reader"
import type { Id } from "@/types"
import {
    createListenerMiddleware,
    type ListenerEffectAPI,
    type ThunkDispatch,
    type UnknownAction,
} from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware<RootState>()

type Dispatch = ThunkDispatch<RootState, unknown, UnknownAction>
type Api = ListenerEffectAPI<RootState, Dispatch>

async function loadSourceInfo(id: Id, listenerApi: Api): Promise<void> {
    listenerApi.dispatch(actions.sourceInfo.infoRequested(id))
    const reader = new SourceReader(id)
    const info = await reader.getInfo()
    if (!info) {
        listenerApi.dispatch(actions.sourceInfo.infoFailed(id))
        return
    }
    listenerApi.dispatch(actions.sourceInfo.infoReceived({ id, info }))

    const state = listenerApi.getState()
    const cached = state.sourceInfo.stats[id] ?? {}
    const columns = Object.keys(info.schema.columns).sort()

    for (const column of columns) {
        if (listenerApi.signal.aborted) return
        if (cached[column]?.status === "ready") continue

        listenerApi.dispatch(actions.sourceInfo.statsRequested({ id, column }))
        const stats = await reader.getColumnStats(column)
        if (listenerApi.signal.aborted) return
        if (stats) {
            listenerApi.dispatch(actions.sourceInfo.statsReceived({ id, column, stats }))
        } else {
            listenerApi.dispatch(actions.sourceInfo.statsFailed({ id, column }))
        }
    }
}

listener.startListening({
    actionCreator: actions.source.select,
    effect: async (action, listenerApi) => {
        listenerApi.cancelActiveListeners()
        if (!action.payload) return
        await loadSourceInfo(action.payload, listenerApi)
    },
})

listener.startListening({
    actionCreator: actions.source.removeSource,
    effect: async (action, listenerApi) => {
        listenerApi.dispatch(actions.sourceInfo.invalidate(action.payload))
    },
})

listener.startListening({
    actionCreator: actions.source.bumpVersion,
    effect: async (action, listenerApi) => {
        const id = action.payload
        listenerApi.dispatch(actions.sourceInfo.invalidate(id))

        const state = listenerApi.getState()
        if (state.source.selectedId !== id) return

        listenerApi.cancelActiveListeners()
        await loadSourceInfo(id, listenerApi)
    },
})

export default listener

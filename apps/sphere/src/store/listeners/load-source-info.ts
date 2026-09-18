import { SourceReader } from "@/lib/source-reader"
import { type Id, SourceType } from "@/types"
import {
    createListenerMiddleware,
    isAnyOf,
    type ListenerEffectAPI,
    type ThunkDispatch,
    type UnknownAction,
} from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware<RootState>()

type Dispatch = ThunkDispatch<RootState, unknown, UnknownAction>
type Api = ListenerEffectAPI<RootState, Dispatch>

// Tile sources have no feature store, so `source_get_info` can only fail for
// them. The panel reads tile metadata from the TileJSON instead.
function isTileSource(state: RootState, id: Id): boolean {
    const type = state.source.items[id]?.type
    return type === SourceType.MVT || type === SourceType.Raster
}

async function loadSourceInfo(id: Id, listenerApi: Api): Promise<void> {
    listenerApi.dispatch(actions.sourceInfo.infoRequested(id))
    const reader = new SourceReader(id)
    const info = await reader.getInfo()
    if (listenerApi.signal.aborted) return
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

// Selecting a source, rebuilding one, and removing one all share a single
// registration on purpose: `cancelActiveListeners()` only reaches other runs of
// the same registration, so splitting them would let a run started by `select`
// keep going — and overwrite fresh stats with pre-rebuild ones — after a
// `bumpVersion` already started a newer run for the same id.
listener.startListening({
    matcher: isAnyOf(actions.source.select, actions.source.bumpVersion, actions.source.removeSource),
    effect: async (action, listenerApi) => {
        if (actions.source.removeSource.match(action)) {
            const removedId = action.payload
            // The reducer has already cleared `selectedId`, so the pre-action
            // state is what tells us whether the running scan was for this id.
            if (listenerApi.getOriginalState().source.selectedId === removedId) {
                listenerApi.cancelActiveListeners()
            }
            listenerApi.dispatch(actions.sourceInfo.invalidate(removedId))
            return
        }

        listenerApi.cancelActiveListeners()

        if (actions.source.bumpVersion.match(action)) {
            listenerApi.dispatch(actions.sourceInfo.invalidate(action.payload))
            if (listenerApi.getState().source.selectedId !== action.payload) return
        }

        const id = action.payload
        if (!id) return
        if (isTileSource(listenerApi.getState(), id)) return
        await loadSourceInfo(id, listenerApi)
    },
})

export default listener

import { MAP_ID } from "@/const"
import { getMap } from "@/map"
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()
listener.startListening({
    matcher: isAnyOf(actions.selection.reset, actions.selection.resetFeature),
    effect: async (_, listenerApi) => {
        const map = getMap(MAP_ID)
        if (!map) {
            return
        }
        // `as RootState` follows the established project-wide listener pattern
        // (all listeners in src/store/listeners/ use this cast — pre-existing technical debt)
        const state = listenerApi.getOriginalState() as RootState
        const sourceId =
            state.selection.sourceId ??
            (state.selection.layerId ? state.layer.items[state.selection.layerId]?.sourceId : undefined)
        if (sourceId) {
            map.removeFeatureState({ source: sourceId })
        }
    },
})

export default listener

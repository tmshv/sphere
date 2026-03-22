import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.layer.removeLayer,
    effect: async (action, listenerApi) => {
        const before = listenerApi.getOriginalState() as RootState
        const deletedLayerId = action.payload
        const selectedLayerId = before.selection.layerId

        if (selectedLayerId !== deletedLayerId) {
            return
        }

        const { items, allIds } = before.layer
        const sorted = [...allIds].sort((a, b) => items[a].fractionIndex - items[b].fractionIndex)
        const idx = sorted.indexOf(deletedLayerId)
        if (idx === -1) {
            return
        }
        const nextId = sorted[idx + 1] ?? sorted[idx - 1]

        listenerApi.dispatch(actions.selection.selectLayer({ layerId: nextId }))
    },
})

listener.startListening({
    actionCreator: actions.source.removeSource,
    effect: async (action, listenerApi) => {
        const before = listenerApi.getOriginalState() as RootState
        const deletedSourceId = action.payload
        const selectedSourceId = before.selection.sourceId

        if (selectedSourceId !== deletedSourceId) {
            return
        }

        const allIds = before.source.allIds
        const idx = allIds.indexOf(deletedSourceId)
        if (idx === -1) {
            return
        }
        const nextId = allIds[idx + 1] ?? allIds[idx - 1]

        listenerApi.dispatch(actions.selection.selectSource({ sourceId: nextId }))
    },
})

export default listener

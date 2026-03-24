import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.layer.removeLayer,
    effect: async (action, listenerApi) => {
        const before = listenerApi.getOriginalState() as RootState
        const deletedLayerId = action.payload
        const selectedLayerId = before.layer.selectedId

        if (selectedLayerId !== deletedLayerId) {
            return
        }

        const { items, allIds } = before.layer
        const sorted = [...allIds].sort((a, b) => items[a].fractionIndex - items[b].fractionIndex)
        const idx = sorted.indexOf(deletedLayerId)
        if (idx === -1) {
            return
        }
        const remaining = sorted.filter(id => id !== deletedLayerId)
        const nextId = remaining.at(idx) ?? remaining.at(idx - 1)

        listenerApi.dispatch(actions.layer.select(nextId))
    },
})

listener.startListening({
    actionCreator: actions.source.removeSource,
    effect: async (action, listenerApi) => {
        const before = listenerApi.getOriginalState() as RootState
        const deletedSourceId = action.payload
        const selectedSourceId = before.source.selectedId

        if (selectedSourceId !== deletedSourceId) {
            return
        }

        const allIds = before.source.allIds
        const idx = allIds.indexOf(deletedSourceId)
        if (idx === -1) {
            return
        }
        const remaining = allIds.filter(id => id !== deletedSourceId)
        const nextId = remaining.at(idx) ?? remaining.at(idx - 1)

        if (nextId) {
            listenerApi.dispatch(actions.source.select(nextId))
        }
    },
})

export default listener

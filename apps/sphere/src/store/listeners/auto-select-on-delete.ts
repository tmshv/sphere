import { collectSubtree } from "@/lib/source-tree"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { sourceSlice } from "../source"
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
        const deletedNodeId = action.payload
        const selectedNodeId = sourceSlice.selectors.selectSelectedId(before)
        if (selectedNodeId === undefined) {
            return
        }

        // Removing a root takes its whole subtree, so a selected child goes with it
        const removedIds = collectSubtree(sourceSlice.selectors.nodes(before), deletedNodeId)
        if (!removedIds.includes(selectedNodeId)) {
            return
        }

        // Only a root can be removed, so the replacement is a root sibling
        const rootIds = sourceSlice.selectors.rootIds(before)
        const idx = rootIds.indexOf(deletedNodeId)
        if (idx === -1) {
            return
        }
        const remaining = rootIds.filter(id => id !== deletedNodeId)
        const nextId = remaining.at(idx) ?? remaining.at(idx - 1)

        listenerApi.dispatch(actions.source.select(nextId))
    },
})

export default listener

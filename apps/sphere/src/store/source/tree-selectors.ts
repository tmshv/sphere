import { hasFeatureStore } from "@/lib/source"
import { isEffectivelyVisible, resolveSourceRef } from "@/lib/source-tree"
import type { Id, SelectedSourceRef, SourceNode } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."

// Read the slice directly: `sourceSlice` imports this module, so importing it back would be a cycle
const selectNodes = (state: RootState) => state.source.nodes
const selectItems = (state: RootState) => state.source.items
const selectSelectedNodeId = (state: RootState) => state.source.selectedIds.at(0)

export const selectSelectedNode = createSelector(
    [selectNodes, selectSelectedNodeId],
    (nodes, id): SourceNode | undefined => (id === undefined ? undefined : nodes[id]),
)

/**
 * The one place that knows a selected node may point into another node's data:
 * a `source-layer` resolves to its parent source, a `folder` to no source.
 */
export const selectSelectedSourceRef = createSelector(
    [selectNodes, selectSelectedNodeId],
    (nodes, id): SelectedSourceRef | undefined => (id === undefined ? undefined : resolveSourceRef(nodes, id)),
)

export const selectSelectedSourceId = (state: RootState): Id | undefined => selectSelectedSourceRef(state)?.sourceId

export const selectSelectedSourceLayer = (state: RootState): string | undefined =>
    selectSelectedSourceRef(state)?.sourceLayer

export const selectSelectedInteractive = createSelector(
    [selectNodes, selectSelectedSourceRef],
    (nodes, ref): boolean => ref?.sourceId !== undefined && isEffectivelyVisible(nodes, ref.nodeId),
)

export type SelectedNodeActions = {
    canZoom: boolean
    canRemove: boolean
    canShowProperties: boolean
    canAddLayer: boolean
}

const NO_NODE_ACTIONS: SelectedNodeActions = {
    canZoom: false,
    canRemove: false,
    canShowProperties: false,
    canAddLayer: false,
}

/**
 * Which Sources tab actions apply to the selected node: a child never goes on
 * its own, a `source-layer` borrows its parent's data, a `folder` has none.
 */
export const selectSelectedNodeActions = createSelector(
    [selectSelectedNode, selectSelectedSourceRef, selectItems],
    (node, ref, items): SelectedNodeActions => {
        if (!node) {
            return NO_NODE_ACTIONS
        }
        const source = ref?.sourceId === undefined ? undefined : items[ref.sourceId]
        return {
            canZoom: ref?.sourceId !== undefined,
            canRemove: node.parentId === undefined,
            canShowProperties: node.kind === "source" && hasFeatureStore(source),
            canAddLayer: node.kind !== "folder",
        }
    },
)

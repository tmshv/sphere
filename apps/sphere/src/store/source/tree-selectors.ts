import { isEffectivelyVisible, resolveSourceRef } from "@/lib/source-tree"
import type { Id, SelectedSourceRef, SourceNode } from "@/types"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."

// Read the slice directly: `sourceSlice` imports this module, so importing it back would be a cycle
const selectNodes = (state: RootState) => state.source.nodes
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

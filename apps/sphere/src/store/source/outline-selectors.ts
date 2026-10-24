import type { Id, SourceNodeKind, SourceNodes, SourceTree, SourceType } from "@/types"
import type { Source } from "@/types/source"
import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."

// Read the slice directly: `sourceSlice` imports the tree selectors, so importing it here risks a cycle
const selectNodes = (state: RootState) => state.source.nodes
const selectRootIds = (state: RootState) => state.source.rootIds
const selectItems = (state: RootState) => state.source.items

export type OutlineNode = {
    id: Id
    label: string
    kind: SourceNodeKind
    sourceType?: SourceType
    visible: boolean
    children: OutlineNode[]
}

function toOutlineNodes(nodes: SourceNodes, items: Record<Id, Source>, ids: Id[]): OutlineNode[] {
    return ids.flatMap(id => {
        const node = nodes[id]
        if (!node) {
            return []
        }
        const outline: OutlineNode = {
            id,
            label: node.name,
            kind: node.kind,
            visible: node.visible,
            children: toOutlineNodes(nodes, items, node.children),
        }
        const source = node.kind === "source" ? items[id] : undefined
        return source ? { ...outline, sourceType: source.type } : outline
    })
}

/** The Sources outline in tree order: roots from `rootIds`, children nested under their parent. */
export const selectSourceOutline = createSelector(
    [selectNodes, selectRootIds, selectItems],
    (nodes, rootIds, items): OutlineNode[] => toOutlineNodes(nodes, items, rootIds),
)

/** The tree's shape, for drop checks that need the whole tree. */
export const selectSourceTreeShape = createSelector(
    [selectNodes, selectRootIds],
    (nodes, rootIds): SourceTree => ({ nodes, rootIds }),
)

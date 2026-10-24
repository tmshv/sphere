import { createDragDropManager } from "dnd-core"
import { useLayoutEffect, useRef } from "react"
import { type NodeApi, type TreeApi, Tree as ArboristTree } from "react-arborist"
import { TouchBackend } from "react-dnd-touch-backend"
import { childIds, branchIds, openState } from "./items"
import { type ArboristMove, toTreeMove } from "./move"
import { TreeRow } from "./TreeRow"
import type { TreeItem, TreeMove } from "./type"
import { useElementSize } from "./useElementSize"

export type { TreeItem, TreeMove } from "./type"

export type TreeProps = {
    items: TreeItem[]
    selectedId?: string
    expandedIds: string[]
    onSelect: (id: string | undefined) => void
    onToggle: (id: string, expanded: boolean) => void
    onMove: (move: TreeMove) => void
    canDrop?: (move: TreeMove) => boolean
}

const ROW_HEIGHT = 30
const INDENT = 16
/** Pointer travel before a press on a row becomes a drag, so jitter while clicking the chevron or an extra does not start one. */
const DRAG_SLOP_PX = 4

/**
 * One manager for every Tree, on the pointer-event touch backend: it stays isolated from other
 * react-dnd providers (the HTML5 one) and is not swallowed by Tauri's native file-drop handler.
 */
const dndManager = createDragDropManager(TouchBackend, undefined, { enableMouseEvents: true, touchSlop: DRAG_SLOP_PX })

export function Tree({ items, selectedId, expandedIds, onSelect, onToggle, onMove, canDrop }: TreeProps) {
    const { ref, width, height } = useElementSize<HTMLDivElement>()
    const treeRef = useRef<TreeApi<TreeItem> | undefined>(undefined)

    // Keep react-arborist's internal open state in line with the controlled expanded ids. A layout
    // effect applies it before paint, so a node opened by default never shows as open for a frame.
    useLayoutEffect(() => {
        const tree = treeRef.current
        if (!tree) {
            return
        }
        const expanded = new Set(expandedIds)
        for (const id of branchIds(items)) {
            if (expanded.has(id)) {
                tree.open(id)
            } else {
                tree.close(id)
            }
        }
    }, [items, expandedIds])

    const toMove = (move: ArboristMove) => toTreeMove(move, childIds(items, move.parentId ?? undefined))

    const handleSelect = (nodes: NodeApi<TreeItem>[]) => {
        const id = nodes.at(0)?.id
        if (id !== selectedId) {
            onSelect(id)
        }
    }

    const handleToggle = (id: string) => {
        const tree = treeRef.current
        if (!tree) {
            return
        }
        const expanded = tree.isOpen(id)
        if (expanded !== expandedIds.includes(id)) {
            onToggle(id, expanded)
        }
    }

    const handleDisableDrop = ({
        parentNode,
        dragNodes,
        index,
    }: {
        parentNode: NodeApi<TreeItem>
        dragNodes: NodeApi<TreeItem>[]
        index: number
    }) => {
        if (!canDrop) {
            return false
        }
        const parentId = parentNode.isRoot ? null : parentNode.id
        return !canDrop(toMove({ dragIds: dragNodes.map(node => node.id), parentId, index }))
    }

    return (
        <div ref={ref} style={{ height: "100%" }}>
            <ArboristTree
                ref={treeRef}
                data={items}
                selection={selectedId}
                initialOpenState={openState(items, expandedIds)}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onMove={({ dragIds, parentId, index }) => onMove(toMove({ dragIds, parentId, index }))}
                disableDrop={handleDisableDrop}
                // New parents start expanded; the sync effect closes any branch missing from expandedIds.
                openByDefault={true}
                disableMultiSelection
                // Clicking empty space must not drop the selection (and with it the feature selection)
                disableDeselectOnClick
                disableEdit
                dndManager={dndManager}
                width={width}
                height={height}
                rowHeight={ROW_HEIGHT}
                indent={INDENT}
            >
                {TreeRow}
            </ArboristTree>
        </div>
    )
}

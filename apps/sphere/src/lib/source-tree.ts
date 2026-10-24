import type { Id, SelectedSourceRef, SourceNode, SourceNodes } from "@/types"

export function childLayerNodeId(parentId: Id, sourceLayer: string): Id {
    return `${parentId}/${sourceLayer}`
}

export function collectSubtree(nodes: SourceNodes, id: Id): Id[] {
    const node = nodes[id]
    if (!node) {
        return []
    }
    return [id, ...node.children.flatMap(child => collectSubtree(nodes, child))]
}

export function isEffectivelyVisible(nodes: SourceNodes, id: Id): boolean {
    let current = nodes[id]
    if (!current) {
        return false
    }
    while (current) {
        if (!current.visible) {
            return false
        }
        if (current.parentId === undefined) {
            return true
        }
        current = nodes[current.parentId]
    }
    return false
}

export function walkTree(nodes: SourceNodes, rootIds: Id[]): SourceNode[] {
    return rootIds.flatMap(rootId => collectSubtree(nodes, rootId).flatMap(id => nodes[id] ?? []))
}

export function siblingsOf(nodes: SourceNodes, rootIds: Id[], id: Id): Id[] {
    const parentId = nodes[id]?.parentId
    if (parentId === undefined) {
        return rootIds
    }
    return nodes[parentId]?.children ?? []
}

export function canMove(
    nodes: SourceNodes,
    rootIds: Id[],
    ids: Id[],
    parentId: Id | undefined,
    index: number,
): boolean {
    const target = parentId === undefined ? undefined : nodes[parentId]
    if (parentId !== undefined && !target) {
        return false
    }
    const moving = ids.flatMap(id => nodes[id] ?? [])
    if (moving.length !== ids.length) {
        return false
    }
    const allowed = moving.every(node => {
        if (node.parentId === parentId) {
            return true
        }
        return node.parentId === undefined && target?.kind === "folder"
    })
    if (!allowed) {
        return false
    }
    if (parentId !== undefined) {
        const blocked = new Set(ids.flatMap(id => collectSubtree(nodes, id)))
        if (blocked.has(parentId)) {
            return false
        }
    }
    const siblings = target ? target.children : rootIds
    return Number.isInteger(index) && index >= 0 && index <= siblings.length
}

export function resolveSourceRef(nodes: SourceNodes, nodeId: Id): SelectedSourceRef {
    const node = nodes[nodeId]
    if (!node) {
        return { nodeId }
    }
    switch (node.kind) {
        case "source":
            return { nodeId, sourceId: nodeId }
        case "source-layer":
            return { nodeId, sourceId: node.parentId, sourceLayer: node.sourceLayer }
        case "folder":
            return { nodeId }
    }
}

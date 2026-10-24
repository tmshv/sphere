import { RASTER_TILE_FORMATS } from "@/lib/tilejson"
import {
    type Id,
    type SelectedSourceRef,
    type SourceLayerRef,
    type SourceNode,
    type SourceNodes,
    type SourceTree,
    type SourceTreeInput,
    SourceType,
} from "@/types"

// Widened so a free-form `format` (GeoJSON formats, test fixtures) can be checked without a cast
const RASTER_FORMATS: ReadonlySet<string> = RASTER_TILE_FORMATS

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

function treeLayers(source: SourceTreeInput): SourceLayerRef[] {
    const raster = source.format !== undefined && RASTER_FORMATS.has(source.format)
    if (source.type !== SourceType.MVT || raster) {
        return []
    }
    return source.sourceLayers ?? []
}

export function createSourceNodes(source: SourceTreeInput): { root: SourceNode; children: SourceNode[] } {
    const children: SourceNode[] = treeLayers(source).map(layer => ({
        id: childLayerNodeId(source.id, layer.id),
        name: layer.name,
        kind: "source-layer",
        sourceLayer: layer.id,
        parentId: source.id,
        visible: true,
        children: [],
    }))
    const root: SourceNode = {
        id: source.id,
        name: source.name,
        kind: "source",
        visible: true,
        children: children.map(child => child.id),
    }
    return { root, children }
}

/**
 * Moves `ids` (in the given order) under `parentId` (root when undefined) at
 * `index`, where `index` counts positions in the target sibling list after the
 * moved ids were taken out of it. Validate with `canMove` first.
 */
export function moveNodes(
    nodes: SourceNodes,
    rootIds: Id[],
    ids: Id[],
    parentId: Id | undefined,
    index: number,
): SourceTree {
    const moving = new Set(ids)
    const detach = (list: Id[]) => list.filter(id => !moving.has(id))
    const insert = (list: Id[]) => [...list.slice(0, index), ...ids, ...list.slice(index)]

    const next: SourceNodes = { ...nodes }
    const oldParentIds = new Set(ids.flatMap(id => nodes[id]?.parentId ?? []))
    for (const oldParentId of oldParentIds) {
        const oldParent = next[oldParentId]
        if (oldParent) {
            next[oldParentId] = { ...oldParent, children: detach(oldParent.children) }
        }
    }
    for (const id of ids) {
        const node = next[id]
        if (node && node.parentId !== parentId) {
            next[id] = { ...node, parentId }
        }
    }

    const detachedRoots = detach(rootIds)
    if (parentId === undefined) {
        return { nodes: next, rootIds: insert(detachedRoots) }
    }
    const parent = next[parentId]
    if (parent) {
        next[parentId] = { ...parent, children: insert(parent.children) }
    }
    return { nodes: next, rootIds: detachedRoots }
}

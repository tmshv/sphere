import type { TreeItem } from "./type"

function findItem(items: TreeItem[], id: string): TreeItem | undefined {
    for (const item of items) {
        if (item.id === id) {
            return item
        }
        const found = findItem(item.children ?? [], id)
        if (found) {
            return found
        }
    }
    return undefined
}

/** Ids of the children of `parentId` in display order; root ids when `parentId` is undefined. */
export function childIds(items: TreeItem[], parentId: string | undefined): string[] {
    if (parentId === undefined) {
        return items.map(item => item.id)
    }
    const parent = findItem(items, parentId)
    return (parent?.children ?? []).map(item => item.id)
}

/** Ids of every item that has at least one child, depth-first. */
export function branchIds(items: TreeItem[]): string[] {
    return items.flatMap(item => {
        const children = item.children ?? []
        if (children.length === 0) {
            return []
        }
        return [item.id, ...branchIds(children)]
    })
}

/** react-arborist open map: every branch is open exactly when it is in `expandedIds`. */
export function openState(items: TreeItem[], expandedIds: string[]): Record<string, boolean> {
    const expanded = new Set(expandedIds)
    return Object.fromEntries(branchIds(items).map(id => [id, expanded.has(id)]))
}

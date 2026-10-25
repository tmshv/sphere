import { adjustMoveIndex } from "react-arborist"
import type { TreeMove } from "./type"

export type ArboristMove = {
    dragIds: string[]
    parentId: string | null
    index: number
}

/**
 * Converts react-arborist's pre-removal drop slot into a post-removal index: every dragged id
 * that already sits in the target sibling list above the slot shifts the target one place left.
 */
export function toTreeMove({ dragIds, parentId, index }: ArboristMove, siblings: string[]): TreeMove {
    return {
        ids: dragIds,
        parentId: parentId ?? undefined,
        index: adjustMoveIndex({ index, dragIds, siblingIds: siblings }),
    }
}

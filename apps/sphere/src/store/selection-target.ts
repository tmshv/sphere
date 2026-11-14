import type { Id } from "@/types"
import type { RootState } from "."
import { selectSelectedInteractive, selectSelectedSourceId } from "./source/tree-selectors"

/** The source selection acts on: the drawn source while drawing, else the one selected in the tree. */
export function selectSelectionTargetSourceId(state: RootState): Id | undefined {
    return state.draw.sourceId ?? selectSelectedSourceId(state)
}

/** While drawing the drawn source is always interactive, whatever the tree says. */
export function selectSelectionTargetInteractive(state: RootState): boolean {
    return state.draw.sourceId !== undefined || selectSelectedInteractive(state)
}

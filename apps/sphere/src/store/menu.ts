import { createAction } from "@reduxjs/toolkit"
import type { RootState } from "."

/**
 * A click on a native menu item. The payload is the item id defined by the
 * backend menu spec, e.g. "view.toggle-zen-mode". The `menu` listener turns it
 * into real actions; nothing else should react to it.
 */
export const menuTrigger = createAction<string>("menu/trigger")

/**
 * What the native menu needs to know to decide which items are usable. The
 * backend owns the mapping from these flags to menu item ids.
 */
export type MenuContext = {
    hasSource: boolean
    hasLayer: boolean
    hasSelection: boolean
}

export const selectMenuContext = (state: RootState): MenuContext => ({
    hasSource: Boolean(state.source.selectedId),
    hasLayer: Boolean(state.layer.selectedId),
    hasSelection: state.selection.count > 0 && Boolean(state.selection.sourceId),
})

export function sameMenuContext(a: MenuContext, b: MenuContext): boolean {
    return a.hasSource === b.hasSource && a.hasLayer === b.hasLayer && a.hasSelection === b.hasSelection
}

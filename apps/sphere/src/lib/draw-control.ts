import type { Id } from "@/types"

/**
 * The part of the draw control (`MapLibreDraw`) the draw toolbar listener drives. Draw's methods
 * return the control for chaining; nothing here chains, so the subset does not ask for it.
 */
export type DrawControlApi = {
    changeMode: (mode: string) => void
    getMode: () => string | null
    trash: () => void
    combineFeatures: () => void
    uncombineFeatures: () => void
}

// The control of the draw session on screen; the draw toolbar listener runs the toolbar's actions on it
let active: { sourceId: Id; control: DrawControlApi; focusMap: () => void } | undefined

/**
 * Makes `control` the one `getDrawControl` finds for `sourceId`. `focusMap` gives the keyboard focus
 * to the map canvas, where draw listens for keys. Returns the unregister function.
 */
export function registerDrawControl(sourceId: Id, control: DrawControlApi, focusMap: () => void): () => void {
    const entry = { sourceId, control, focusMap }
    active = entry
    return () => {
        if (active === entry) {
            active = undefined
        }
    }
}

/** The registered control of the session on `sourceId`, if any. */
export function getDrawControl(sourceId: Id): DrawControlApi | undefined {
    if (active?.sourceId !== sourceId) {
        return undefined
    }
    return active.control
}

/** Gives the keyboard focus to the map canvas of the session on `sourceId`, if one is registered. */
export function focusDrawMap(sourceId: Id) {
    if (active?.sourceId === sourceId) {
        active.focusMap()
    }
}

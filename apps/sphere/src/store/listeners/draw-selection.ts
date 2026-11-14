import { sameIds, toBackendIds } from "@/lib/draw-selection"
import { getDrawQueue } from "@/lib/draw-session"
import { emitSelectionDelta, emitSelectionReconcile } from "@/lib/selection-bus"
import { type SelectionDelta, selectionSet } from "@/lib/selection-ipc"
import type { DrawFeatureId } from "@/types"
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { surfaceError } from "./draw-session-end"

const SELECTION_FAILED = "Could not select the drawn features"

const listener = createListenerMiddleware<RootState>()

// Only the latest change emits and dispatches; an older one drops out once a newer one started
let generation = 0
// Draw ids of the change last mirrored. A change with the same ids only moved the selected vertices
let lastIds: DrawFeatureId[] | undefined
// Each selection_set settles before the next is sent, so the backend applies them in order
let sending: Promise<unknown> = Promise.resolve()
// A superseded change set the backend selection but emitted nothing; the next one restates it whole
let unsynced = false

/**
 * Mirrors draw's feature selection to the backend selection: waits for every
 * queued edit (so a created feature has its backend id), sends the backend
 * ids with `selection_set`, and puts the delta on the selection bus, so
 * feature-state, the count and the attribute table follow as outside draw.
 * Draw already shows the selection, so its own delta changes nothing there.
 */
listener.startListening({
    actionCreator: actions.draw.selectionChanged,
    effect: async (action, api) => {
        const { sourceId, ids } = action.payload
        if (api.getState().draw.sourceId !== sourceId) return
        if (lastIds !== undefined && sameIds(ids, lastIds)) return
        generation += 1
        const current = generation
        const queue = getDrawQueue(sourceId)
        if (!queue) return

        const flushed = await queue.flush()
        // A failed queue already surfaced its error, and the backend lags behind draw: send nothing
        if (!flushed.ok || current !== generation) return
        // Every create has settled, so every id maps; one that does not is skipped, never sent as a string
        const backendIds = toBackendIds(ids, id => queue.backendId(id))

        await sending
        if (current !== generation) return
        const request = selectionSet(backendIds)
        sending = request.catch(() => undefined)
        let delta: SelectionDelta
        try {
            delta = await request
        } catch (err) {
            if (current === generation) {
                surfaceError(api, SELECTION_FAILED, err)
            } else {
                unsynced = true
            }
            return
        }
        if (current !== generation) {
            unsynced = true
            return
        }

        emitSelectionDelta(delta)
        if (unsynced) {
            // selection_set replaced the whole backend selection with exactly these ids
            emitSelectionReconcile(backendIds, sourceId)
            unsynced = false
        }
        api.dispatch(actions.selection.sync({ count: backendIds.length, sourceId }))
        api.dispatch(actions.selection.apply())
        // After the sync above, which forgets the last ids like any other selection change
        lastIds = ids
    },
})

// The selection changed elsewhere (a rectangle, a clear, a refresh) or a new session began:
// draw's next change is sent even when its ids equal the last ones sent
listener.startListening({
    matcher: isAnyOf(actions.selection.sync, actions.selection.reset, actions.draw.started),
    effect: action => {
        lastIds = undefined
        if (actions.draw.started.match(action)) {
            unsynced = false
        }
    },
})

export default listener

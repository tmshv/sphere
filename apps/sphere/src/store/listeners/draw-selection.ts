import { sameIds, toBackendIds } from "@/lib/draw-selection"
import { getDrawQueue } from "@/lib/draw-session"
import { emitSelectionDelta, emitSelectionReconcile } from "@/lib/selection-bus"
import { type SelectionDelta, selectionSet } from "@/lib/selection-ipc"
import type { DrawFeatureId } from "@/types"
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { refreshSelection, surfaceError } from "./draw-session-end"

const SELECTION_FAILED = "Could not select the drawn features"

const listener = createListenerMiddleware<RootState>()

// Only the latest change emits and dispatches; an older one drops out once a newer one started
let generation = 0
// Bumped at every session boundary (start, done, reset): a change of an ended session does nothing more
let session = 0
// Draw ids of the latest change started. A change with the same ids only moved the selected vertices
let lastIds: DrawFeatureId[] | undefined
// Each selection_set settles before the next is sent, so the backend applies them in order
let sending: Promise<unknown> = Promise.resolve()
// A superseded change set the backend selection but emitted nothing; the next delta is not the whole truth
let unsynced = false
// True while this listener dispatches its own sync, which must not forget the ids it just mirrored
let syncing = false

/**
 * Mirrors draw's feature selection to the backend selection: waits for every
 * queued edit (so a created feature has its backend id), sends the backend
 * ids with `selection_set`, and puts the delta on the selection bus, so
 * feature-state, the count and the attribute table follow as outside draw.
 *
 * The delta is id-only. It is the truth only when the selection already
 * belonged to the drawn source and no earlier delta was dropped; otherwise
 * (another source's selection may share ids with the drawn one) a reconcile
 * with the ids sent follows, since `selection_set` replaced the whole
 * selection with exactly them. A reconcile re-sets every highlight, so it is
 * kept for those cases: a delta stays cheap on large selections.
 */
listener.startListening({
    actionCreator: actions.draw.selectionChanged,
    effect: async (action, api) => {
        const { sourceId, ids } = action.payload
        if (api.getState().draw.sourceId !== sourceId) return
        if (lastIds !== undefined && sameIds(ids, lastIds)) return
        lastIds = ids
        generation += 1
        const current = generation
        const ownSession = session
        // Still the session this change was made in, which draws the same source
        const isLive = () => ownSession === session && api.getState().draw.sourceId === sourceId
        const isCurrent = () => current === generation && isLive()
        // Nothing was sent: the same click may retry, unless a newer change took over
        const forget = () => {
            if (isCurrent()) lastIds = undefined
        }
        const queue = getDrawQueue(sourceId)
        if (!queue) {
            forget()
            return
        }

        const flushed = await queue.flush()
        if (!isLive()) return
        // A failed queue already surfaced its error, and the backend lags behind draw: send nothing
        if (!flushed.ok) {
            forget()
            return
        }
        if (!isCurrent()) return
        // Every create has settled, so every id maps; one that does not is skipped, never sent as a string
        const backendIds = toBackendIds(ids, id => queue.backendId(id))

        await sending
        if (!isCurrent()) return
        const trusted = api.getState().selection.sourceId === sourceId
        const request = selectionSet(backendIds)
        sending = request.catch(() => undefined)
        let delta: SelectionDelta
        try {
            delta = await request
        } catch (err) {
            if (!isLive()) return
            if (!isCurrent()) {
                unsynced = true
                return
            }
            surfaceError(api, SELECTION_FAILED, err)
            lastIds = undefined
            // The click did not land: bring draw back to the backend selection, unless a newer change won
            await refreshSelection(api, sourceId, isCurrent)
            return
        }
        if (!isLive()) return
        if (!isCurrent()) {
            unsynced = true
            return
        }

        emitSelectionDelta(delta)
        if (unsynced || !trusted) {
            emitSelectionReconcile(backendIds, sourceId)
            unsynced = false
        }
        syncing = true
        try {
            api.dispatch(actions.selection.sync({ count: backendIds.length, sourceId }))
        } finally {
            syncing = false
        }
        api.dispatch(actions.selection.apply())
    },
})

// The selection changed elsewhere (a rectangle, a clear, a refresh) or a session began or ended:
// draw's next change is sent even when its ids equal the last ones
listener.startListening({
    matcher: isAnyOf(
        actions.selection.sync,
        actions.selection.reset,
        actions.draw.started,
        actions.draw.done,
        actions.draw.reset,
    ),
    effect: action => {
        if (syncing) return
        lastIds = undefined
        if (isAnyOf(actions.draw.started, actions.draw.done, actions.draw.reset)(action)) {
            session += 1
            unsynced = false
        }
    },
})

export default listener

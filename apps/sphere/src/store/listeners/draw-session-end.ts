import { type DrawOpQueue, rollbackDraw } from "@/lib/draw-session"
import { errorMessage } from "@/lib/error-message"
import { emitSelectionReconcile } from "@/lib/selection-bus"
import { selectionGetIds } from "@/lib/selection-ipc"
import type { Dispatch } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"

/** What the draw session listeners need from their listener API. */
export type DrawListenerApi = {
    dispatch: Dispatch
    getState: () => RootState
}

const SELECTION_REFRESH_FAILED = "Could not refresh the selection after drawing"
const ROLLBACK_FAILED = "Could not discard the draw edits"

export function surfaceError(api: DrawListenerApi, context: string, err: unknown) {
    api.dispatch(actions.error.setError(`${context}: ${errorMessage(err)}`))
}

/**
 * Re-reads the backend selection after a commit or rollback, which drop the
 * ids that no longer exist, so deleted features do not stay highlighted and
 * the count and properties panel follow.
 */
export async function refreshSelection(api: DrawListenerApi, sourceId: string): Promise<void> {
    let ids: number[]
    try {
        ids = await selectionGetIds()
    } catch (err) {
        surfaceError(api, SELECTION_REFRESH_FAILED, err)
        return
    }
    const selectionSourceId = api.getState().selection.sourceId
    emitSelectionReconcile(ids, selectionSourceId ?? sourceId)
    api.dispatch(actions.selection.sync({ count: ids.length, sourceId: selectionSourceId }))
    api.dispatch(actions.selection.apply())
}

/**
 * Discards the session's edits on the backend. Ops still in the queue land
 * first, so none arrives after the session is gone. Returns false, with the
 * error surfaced, when the rollback failed. The source is not re-fetched: the
 * rollback restores exactly what the map's copy of it already shows.
 */
export async function rollbackSession(
    api: DrawListenerApi,
    sourceId: string,
    queue: DrawOpQueue | undefined,
): Promise<boolean> {
    // The outcome does not matter: the rollback discards every op, applied or not
    await queue?.flush()
    try {
        await rollbackDraw(sourceId)
    } catch (err) {
        surfaceError(api, ROLLBACK_FAILED, err)
        return false
    }
    await refreshSelection(api, sourceId)
    return true
}

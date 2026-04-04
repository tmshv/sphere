import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectionGetIds } from "@/lib/selection-ipc"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: actions.draw.start,
    effect: async (action, listenerApi) => {
        const sourceId = action.payload.sourceId
        const state = listenerApi.getState() as RootState
        const sel = state.selection

        let selectedIds: number[] = []
        if (sel.count > 0 && sel.sourceId === sourceId) {
            const versionBefore = sel.version
            try {
                selectedIds = await selectionGetIds()
            } catch {
                selectedIds = []
            }
            const selAfter = (listenerApi.getState() as RootState).selection
            if (selAfter.sourceId !== sourceId || selAfter.version !== versionBefore) {
                selectedIds = []
            }
        }

        listenerApi.dispatch(actions.draw.setSelectedIds(selectedIds))
        listenerApi.dispatch(actions.tools.setTool("draw"))
    },
})

export default listener

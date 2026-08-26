import { copySelectionAsGeojson, copySelectionAsWkt } from "@/lib/copy-selection"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { copySelection } from "../selection"
import { selectors } from "../selectors"

const listener = createListenerMiddleware()

listener.startListening({
    actionCreator: copySelection,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState
        const sourceId = selectors.selection.sourceId(state)
        const count = selectors.selection.count(state)

        if (!sourceId || count === 0) {
            return
        }

        try {
            if (action.payload === "geojson") {
                const wrapFc = selectors.settings.selectCopyWrapAsFeatureCollection(state)
                await copySelectionAsGeojson(sourceId, wrapFc)
                return
            }

            const separator = selectors.settings.selectCopyWktSeparator(state)
            await copySelectionAsWkt(sourceId, separator)
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to copy selection"
            listenerApi.dispatch(actions.error.setError(message))
        }
    },
})

export default listener

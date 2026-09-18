import { sourceMetadataFromSchema } from "@/lib/source-metadata"
import { SourceReader } from "@/lib/source-reader"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { applyCsvGeometry } from "../sourceInfo/applyCsvGeometry"

const listener = createListenerMiddleware<RootState>()

listener.startListening({
    actionCreator: applyCsvGeometry,
    effect: async (action, listenerApi) => {
        const { id, mode, wktColumn, xColumn, yColumn } = action.payload
        const reader = new SourceReader(id)

        try {
            const schema = await reader.setCsvGeometry({ mode, wktColumn, xColumn, yColumn })
            listenerApi.dispatch(actions.source.setGeojsonMeta({ id, meta: sourceMetadataFromSchema(schema) }))
            listenerApi.dispatch(actions.sourceInfo.invalidate(id))
            listenerApi.dispatch(actions.selection.reset())
            listenerApi.dispatch(actions.source.bumpVersion(id))
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            listenerApi.dispatch(actions.error.setError(message))
        }
    },
})

export default listener

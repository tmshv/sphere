import { toCsvGeometryParams } from "@/lib/csv-geometry"
import { sourceMetadataFromSchema } from "@/lib/source-metadata"
import { SourceReader } from "@/lib/source-reader"
import type { SourceSchema } from "@/types"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { applyCsvGeometry } from "../sourceInfo/applyCsvGeometry"

const listener = createListenerMiddleware<RootState>()

listener.startListening({
    actionCreator: applyCsvGeometry,
    effect: async (action, listenerApi) => {
        const { id, ...staged } = action.payload
        const reader = new SourceReader(id)

        let schema: SourceSchema
        try {
            schema = await reader.setCsvGeometry(toCsvGeometryParams(staged))
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            listenerApi.dispatch(actions.error.setError(message))
            return
        }

        listenerApi.dispatch(actions.source.setGeojsonMeta({ id, meta: sourceMetadataFromSchema(schema) }))
        listenerApi.dispatch(actions.sourceInfo.invalidate(id))
        listenerApi.dispatch(actions.selection.reset())
        listenerApi.dispatch(actions.source.bumpVersion(id))
    },
})

export default listener

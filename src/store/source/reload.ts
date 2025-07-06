import { createAsyncThunk } from "@reduxjs/toolkit"
import { Id, SourceType } from "@/types"
import { actions } from "."
import logger from "@/logger"
import SourceReaderFixId from "@/lib/source-reader-fix-id"
import { RootState } from ".."

export const reload = createAsyncThunk(
    "source/reload",
    async (id: Id, thunkAPI) => {
        const state = thunkAPI.getState() as RootState
        const type = state.source.items[id].type
        try {
            switch (type) {
                case SourceType.Geojson: {
                    const { location } = state.source.items[id]
                    const r = new SourceReaderFixId(location)
                    const metadata = await r.getSchema() ?? {}
                    const dataset = await r.getGeojson() ?? undefined
                    thunkAPI.dispatch(actions.setGeojsonData({
                        id,
                        metadata,
                        dataset,
                    }))
                    break
                }
                default: {
                    break
                }
            }
        } catch (error) {
            logger.error("Failed to add Source", error)
        }
    },
)

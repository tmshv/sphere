import { createAsyncThunk } from "@reduxjs/toolkit"
import { Id, SourceType } from "@/types"
import { actions } from "."
import logger from "@/logger"
import { SourceReader } from "@/lib/source-reader"
import { RootState } from ".."

const action = createAsyncThunk(
    "source/reload",
    async (id: Id, thunkAPI) => {
        const state = thunkAPI.getState() as RootState
        try {
            if (!state.source.items[id]) {
                return
            }
            const type = state.source.items[id].type
            switch (type) {
                case SourceType.Geojson: {
                    const { location } = state.source.items[id]
                    const r = new SourceReader(location)
                    const schema = await r.getSchema()
                    const metadata = schema ? schema.columns : undefined
                    const meta = schema ? {
                        pointsCount: schema.points_count,
                        linesCount: schema.lines_count,
                        polygonsCount: schema.polygons_count,
                    } : undefined
                    const dataset = await r.getGeojson() ?? undefined
                    thunkAPI.dispatch(actions.setGeojsonData({
                        id,
                        metadata,
                        meta,
                        dataset,
                    }))
                    break
                }
                default: {
                    break
                }
            }
        } catch (error) {
            logger.error("Failed to reload Source %s", error)
        }
    },
)

export default action

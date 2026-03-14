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
        const type = state.source.items[id].type
        try {
            switch (type) {
                case SourceType.Geojson: {
                    const { location } = state.source.items[id]
                    const r = new SourceReader(location)
                    const schema = await r.getSchema()
                    const metadata = schema?.columns ?? {}
                    const meta = {
                        pointsCount: schema?.points_count ?? 0,
                        linesCount: schema?.lines_count ?? 0,
                        polygonsCount: schema?.polygons_count ?? 0,
                    }
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
            logger.error("Failed to add Source %s", error)
        }
    },
)

export default action

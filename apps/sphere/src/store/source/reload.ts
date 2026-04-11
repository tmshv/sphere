import { SourceReader } from "@/lib/source-reader"
import logger from "@/logger"
import { type Id, SourceType } from "@/types"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { actions } from "."
import type { RootState } from ".."

const action = createAsyncThunk("source/reload", async (id: Id, thunkAPI) => {
    const state = thunkAPI.getState() as RootState
    try {
        if (!state.source.items[id]) {
            return
        }
        const type = state.source.items[id].type
        switch (type) {
            case SourceType.Geojson: {
                const r = new SourceReader(id)
                const schema = await r.getSchema()
                if (schema) {
                    thunkAPI.dispatch(
                        actions.setGeojsonMeta({
                            id,
                            meta: {
                                columns: schema.columns,
                                pointsCount: schema.points_count,
                                linesCount: schema.lines_count,
                                polygonsCount: schema.polygons_count,
                            },
                        }),
                    )
                }
                break
            }
            default: {
                break
            }
        }
    } catch (error) {
        logger.error("Failed to reload Source %s", error)
    }
})

export default action

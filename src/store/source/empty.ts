import { invoke } from "@tauri-apps/api/core"
import { createAsyncThunk } from "@reduxjs/toolkit"
import logger from "@/logger"
import { actions } from "."

const action = createAsyncThunk("source/empty", async (name: string, thunkAPI) => {
    try {
        const emptyData = JSON.stringify({ type: "FeatureCollection", features: [] })
        const result = await invoke<{ id: string; name: string; location: string }>("source_add_data", {
            name,
            data: emptyData,
        })
        thunkAPI.dispatch(
            actions.addInMemorySource({
                id: result.id,
                name: result.name,
                location: result.location,
                meta: {
                    columns: {},
                    pointsCount: 0,
                    linesCount: 0,
                    polygonsCount: 0,
                },
            }),
        )
    } catch (error) {
        logger.error("Failed to create empty source: %s", error)
    }
})

export default action

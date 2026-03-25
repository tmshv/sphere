import { invoke } from "@tauri-apps/api/core"
import { createAsyncThunk } from "@reduxjs/toolkit"
import logger from "@/logger"
import { nextId } from "@/lib/nextId"
import { actions } from "."

const action = createAsyncThunk("source/new", async (_: undefined, thunkAPI) => {
    const name = `New ${nextId("source")}`
    try {
        const result = await invoke<{ id: string; name: string; location: string }>("source_add_data", {
            name,
            data: { type: "FeatureCollection", features: [] },
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

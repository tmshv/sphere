import { createAsyncThunk } from "@reduxjs/toolkit"
import { actions } from "."
import { nextId } from "@/lib/nextId"

const action = createAsyncThunk("source/empty", async (_, thunkAPI) => {
    const id = nextId("source")
    const name = `New ${id}`
    thunkAPI.dispatch(actions.addFeatureCollection({
        id,
        name,
        dataset: {
            type: "FeatureCollection",
            features: [],
        },
    }))
})

export default action

import { createAsyncThunk } from "@reduxjs/toolkit"
import { actions } from "@/store/actions"

const addMultipleFiles = createAsyncThunk("addMultipleFiles", async (paths: string[], thunkAPI) => {
    for (const path of paths) {
        thunkAPI.dispatch(actions.addFile(path))
    }
})

export default addMultipleFiles

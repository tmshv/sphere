import { createAsyncThunk } from "@reduxjs/toolkit"
import addFile from "./add-file"

const addMultipleFiles = createAsyncThunk("addMultipleFiles", async (paths: string[], thunkAPI) => {
    for (const path of paths) {
        thunkAPI.dispatch(addFile(path))
    }
})

export default addMultipleFiles

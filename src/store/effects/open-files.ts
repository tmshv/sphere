import { createAsyncThunk } from "@reduxjs/toolkit"
import { open } from "@tauri-apps/plugin-dialog"
import addMultipleFiles from "./add-multiple-files"

const openFiles = createAsyncThunk("openFiles", async (_, thunkAPI) => {
    const selected = await open({
        multiple: true,
        filters: [
            {
                name: "Geospatial file",
                extensions: ["csv", "geojson", "geojsonl", "json", "gpx", "mbtiles", "shp"],
            },
        ],
    })
    if (!selected) {
        return
    }

    const paths = Array.isArray(selected) ? selected : [selected]

    thunkAPI.dispatch(addMultipleFiles(paths))
})

export default openFiles

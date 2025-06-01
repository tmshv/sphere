import { createAsyncThunk } from "@reduxjs/toolkit"
import { open } from "@tauri-apps/plugin-dialog"
import { actions } from "@/store/actions"

const openFiles = createAsyncThunk("openFiles", async (_, thunkAPI) => {
    const selected = await open({
        multiple: true,
        filters: [{
            name: "Geospatial file",
            extensions: ["csv", "geojson", "json", "gpx", "mbtiles", "shp"],
        }],
    })
    if (!selected) {
        return
    }

    const paths = Array.isArray(selected)
        ? selected
        : [selected]

    thunkAPI.dispatch(actions.addMultipleFiles(paths))
})

export default openFiles

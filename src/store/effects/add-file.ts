import { createAsyncThunk } from "@reduxjs/toolkit"
import { extname } from "@tauri-apps/api/path"
import { readTextFile } from "@tauri-apps/plugin-fs"
import { SourceType } from "@/types"
import { actions } from "@/store/actions"

function isStyle(value: object): boolean {
    // TODO check the value is real maplibre style
    return true
}

const addFile = createAsyncThunk("addFile", async (path: string, thunkAPI) => {
    let ext = await extname(path)
    if (ext) {
        ext = ext.toLowerCase()
    }
    switch (ext) {
        case "json": {
            const contents = await readTextFile(path)
            const data = JSON.parse(contents)
            if (isStyle(data)) {
                thunkAPI.dispatch(actions.mapStyle.setMapStyle(data))
            }
            break
        }
        case "mbtiles": {
            const url = `sphere://mbtiles${path}`
            thunkAPI.dispatch(actions.source.addFromUrl({
                url,
                type: SourceType.MVT,
                // type: SourceType.Raster,
            }))
            break
        }
        default: {
            const url = `sphere://source${path}`
            thunkAPI.dispatch(actions.source.addFromUrl({
                url,
                type: SourceType.Geojson,
            }))
            break
        }
    }

    // this is true side effects
    // thunkAPI.dispatch(actions.app.showLeftSidebar())
    // await listenerApi.delay(1000)
    // const state = listenerApi.getState() as RootState
    // const id = state.source.lastAdded
    // if (!id) {
    //     return
    // }
    // const geom = state.source.items[id].data
    // const bbox = turf.bbox(geom);
    // listenerApi.dispatch(fitBounds({
    //     mapId: "spheremap",
    //     bounds: bbox as mapboxgl.LngLatBoundsLike
    // }))
})

export default addFile

import { createAsyncThunk } from "@reduxjs/toolkit"
import { extname } from "@tauri-apps/api/path"
import { SourceType } from "@/types"
import { open } from "@tauri-apps/plugin-dialog"
import { addFromUrl } from "./addFromUrl"

export const addFromFiles = createAsyncThunk("source/addFromFiles", async (paths: string[], thunkAPI) => {
    if (paths.length === 0) {
        const selected = await open({
            multiple: true,
            filters: [{
                name: "Geospatial file",
                extensions: ["csv", "geojson", "gpx", "mbtiles", "shp"],
            }],
        })
        if (!selected) {
            return
        }

        if (Array.isArray(selected)) {
            paths = selected
        } else {
            paths = [selected]
        }
    }

    for (const path of paths) {
        let ext = await extname(path)
        if (ext) {
            ext = ext.toLowerCase()
        }
        switch (ext) {
            case "mbtiles": {
                const url = `sphere://mbtiles${path}`
                thunkAPI.dispatch(addFromUrl({
                    url,
                    type: SourceType.MVT,
                    // type: SourceType.Raster,
                }))
                break
            }
            default: {
                const url = `sphere://source${path}`
                thunkAPI.dispatch(addFromUrl({
                    url,
                    type: SourceType.Geojson,
                }))
                break
            }
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

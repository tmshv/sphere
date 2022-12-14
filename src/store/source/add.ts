import { createAsyncThunk, createAction } from "@reduxjs/toolkit"
import { readTextFile } from "@tauri-apps/api/fs"
import { basename, extname } from "@tauri-apps/api/path"
import { parseGeojson } from "../../lib/parseGeojson"
import { parseGpx } from "../../lib/parseGpx"
import { parseCsv } from "@/lib/parseCsv"
import { FileParser } from "@/types"
import { nextId } from "@/lib/nextId"
import { open } from "@tauri-apps/api/dialog"
import { actions } from "."

const parsers = new Map<string, FileParser>([
    ["json", parseGeojson],
    ["geojson", parseGeojson],
    ["gpx", parseGpx],
    ["csv", parseCsv],
])

export const addFromFiles = createAsyncThunk("source/addFromFiles", async (paths: string[], thunkAPI) => {
    if (paths.length === 0) {
        const selected = await open({
            multiple: true,
            filters: [{
                name: "Geospatial file",
                extensions: ["csv", "geojson", "gpx"],
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

    for (const file of paths) {
        thunkAPI.dispatch(addFromFile(file))
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

export const addFromFile = createAsyncThunk("source/addFromFile", async (path: string, thunkAPI) => {
    const ext = await extname(path)
    if (!parsers.has(ext)) {
        throw new Error("Cannot find parser")
    }

    // const name = (dataset as any).name ?? await basename(path)
    const name = await basename(path)
    const sourceId = nextId("source")

    // add pending source
    thunkAPI.dispatch(actions.addFeatureCollection({
        id: sourceId,
        name,
        location: path,
        // dataset,
    }))

    const parser = parsers.get(ext)!
    const raw = await readTextFile(path)
    const [dataset, meta] = await parser(raw)

    // add source later
    thunkAPI.dispatch(actions.setData({
        id: sourceId,
        dataset,
        meta,
    }))

    return {
        sourceId,
        meta,
        name,
    }
})

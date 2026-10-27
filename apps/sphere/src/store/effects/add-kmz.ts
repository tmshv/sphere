import logger from "@/logger"
import { SourceType } from "@/types"
import { getStem } from "@sphere/utils"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { invoke } from "@tauri-apps/api/core"
import { actions as source } from "../source"

// Query param that picks one KML document out of a KMZ archive (read by libsphere)
const KMZ_ENTRY_PARAM = "entry"

// A KMZ with several KML documents becomes a folder named after the file, holding one child
// source per document. One with a single document (or none, e.g. a mislabelled plain KML) is a
// plain source.
const addKmz = createAsyncThunk("addKmz", async (path: string, thunkAPI) => {
    const url = encodeURI(`file://${path}`)
    let documents: string[]
    try {
        documents = await invoke<string[]>("kml_list_documents", { path })
    } catch (error) {
        // Load it as one source so a broken archive fails the same way as any other file
        logger.error("Failed to list KMZ documents %s", error)
        documents = []
    }

    if (documents.length <= 1) {
        thunkAPI.dispatch(source.addFromUrl({ url, type: SourceType.Geojson }))
        return
    }

    // The archive URL is unique per file, so opening the same file again reuses its folder
    const folderId = url
    thunkAPI.dispatch(source.addFolder({ id: folderId, name: getStem(path) ?? path }))
    // One at a time, so children land in archive order
    for (const entry of documents) {
        await thunkAPI.dispatch(
            source.addFromUrl({
                url: `${url}?${KMZ_ENTRY_PARAM}=${encodeURIComponent(entry)}`,
                type: SourceType.Geojson,
                parentId: folderId,
            }),
        )
    }
    thunkAPI.dispatch(source.select(folderId))
})

export default addKmz

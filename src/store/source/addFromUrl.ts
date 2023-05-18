import { createAsyncThunk } from "@reduxjs/toolkit"
import { SourceType } from "@/types"
import { actions } from "."
import { MbtilesReader } from "@/lib/mbtiles"
import { invoke } from "@tauri-apps/api"
import logger from "@/logger"

type NewSource = {
    id: string,
    name: string,
    location: string,
}

export type AddFromUrlOptions = {
    url: string,
    type: SourceType.Geojson | SourceType.MVT | SourceType.Raster
}

export const addFromUrl = createAsyncThunk(
    "source/addFromUrl",
    async ({ url, type }: AddFromUrlOptions, thunkAPI) => {
        try {
            // const id = nextId("source")
            const s = await invoke<NewSource>("source_add", {
                sourceUrl: url,
            })
            logger.info("Got source", s)
            let { id, name, location } = s

            switch (type) {
                case SourceType.MVT: {
                    const r = new MbtilesReader(location)
                    const tilejson = await r.getTileJson()
                    if (tilejson) {
                        logger.info("Got tilejson", tilejson)
                        if (tilejson.name) {
                            name = tilejson.name
                        }
                        const sourceLayers = tilejson.vector_layers.map(({ id }) => ({ id, name: id })) ?? []
                        thunkAPI.dispatch(actions.addSource({
                            id,
                            name,
                            type,
                            location,
                            sourceLayers,
                        }))
                    }
                    break
                }
                case SourceType.Raster: {
                    const r = new MbtilesReader(location)
                    const tilejson = await r.getTileJson()
                    if (tilejson) {
                        if (tilejson.name) {
                            name = tilejson.name
                        }
                        thunkAPI.dispatch(actions.addSource({
                            id,
                            name,
                            location,
                            type,
                        }))
                    }
                    break
                }
                case SourceType.Geojson: {
                    thunkAPI.dispatch(actions.addSource({
                        id,
                        name,
                        location,
                        type,
                    }))
                    break
                }
                default: {
                    break
                }
            }
        } catch (error) {
            logger.error("Failed to add Source", error)
        }
    },
)

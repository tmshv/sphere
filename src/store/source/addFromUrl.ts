import { createAsyncThunk } from "@reduxjs/toolkit"
import { SourceType } from "@/types"
import { actions } from "."
import { MbtilesReader } from "@/lib/mbtiles"
import { invoke } from "@tauri-apps/api"
import logger from "@/logger"
import { SourceReader } from "@/lib/source-reader"

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
                        thunkAPI.dispatch(actions.addMVTSource({
                            id,
                            name,
                            location,
                            sourceLayers,
                            tilejson,
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
                        thunkAPI.dispatch(actions.addRasterSource({
                            id,
                            name,
                            location,
                        }))
                    }
                    break
                }
                case SourceType.Geojson: {
                    const r = new SourceReader(location)
                    const metadata = await r.getSchema() ?? {}
                    thunkAPI.dispatch(actions.addGeojsonSource({
                        id,
                        name,
                        location,
                        metadata,
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

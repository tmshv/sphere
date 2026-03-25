import { MbtilesReader } from "@/lib/mbtiles"
import { SourceReader } from "@/lib/source-reader"
import logger from "@/logger"
import { SourceType } from "@/types"
import { isRasterTileFormat } from "@/types/tilejson"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { invoke } from "@tauri-apps/api/core"
import { actions } from "."

type NewSource = {
    id: string
    name: string
    location: string
}

export type AddFromUrlOptions = {
    url: string
    type: SourceType.Geojson | SourceType.MVT | SourceType.Raster
}

const action = createAsyncThunk("source/addFromUrl", async ({ url, type }: AddFromUrlOptions, thunkAPI) => {
    try {
        // const id = nextId("source")
        const s = await invoke<NewSource>("source_add", {
            sourceUrl: url,
        })
        logger.info("Got url source %s", s)
        const { id, location } = s
        let { name } = s

        switch (type) {
            case SourceType.MVT: {
                const r = new MbtilesReader(id)
                const tilejson = await r.getTileJson()
                if (tilejson) {
                    logger.info({ tilejson }, "Got tilejson")
                    if (tilejson.name) {
                        name = tilejson.name
                    }
                    const format = tilejson.format ?? "pbf"
                    const sourceLayers = isRasterTileFormat(format)
                        ? []
                        : (tilejson.vector_layers ?? []).map(({ id }) => ({ id, name: id }))
                    thunkAPI.dispatch(
                        actions.addMVTSource({
                            id,
                            name,
                            location,
                            sourceLayers,
                            tilejson,
                            format,
                        }),
                    )
                } else {
                    logger.error("Failed to get TileJSON for source %s", id)
                }
                break
            }
            case SourceType.Raster: {
                const r = new MbtilesReader(id)
                const tilejson = await r.getTileJson()
                if (tilejson) {
                    if (tilejson.name) {
                        name = tilejson.name
                    }
                    thunkAPI.dispatch(
                        actions.addRasterSource({
                            id,
                            name,
                            location,
                        }),
                    )
                } else {
                    logger.error("Failed to get TileJSON for raster source %s", id)
                }
                break
            }
            case SourceType.Geojson: {
                const r = new SourceReader(id)
                const schema = await r.getSchema()
                const meta = {
                    columns: schema?.columns ?? {},
                    pointsCount: schema?.points_count ?? 0,
                    linesCount: schema?.lines_count ?? 0,
                    polygonsCount: schema?.polygons_count ?? 0,
                }
                thunkAPI.dispatch(
                    actions.addGeojsonSource({
                        id,
                        name,
                        location,
                        meta,
                    }),
                )
                break
            }
            default: {
                break
            }
        }
    } catch (error) {
        logger.error("Failed to add Source %s", error)
    }
})

export default action

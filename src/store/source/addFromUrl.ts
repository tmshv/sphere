import { createAsyncThunk } from "@reduxjs/toolkit"
import { SourceType } from "@/types"
import { nextId } from "@/lib/nextId"
import { actions } from "."
import { getStem } from "@/lib/path"
import { get } from "@/lib/http"
import { MbtilesReader } from "@/lib/mbtiles"

export type AddFromUrlOptions = {
    url: string,
    type: SourceType.Geojson | SourceType.MVT | SourceType.Raster
}

export const addFromUrl = createAsyncThunk(
    "source/addFromUrl",
    async ({ url, type }: AddFromUrlOptions, thunkAPI) => {
        const id = nextId("source")
        const x = new URL(url)
        const stem = getStem(x.pathname)
        let name = stem ?? id

        switch (type) {
            case SourceType.MVT: {
                const u = new URL(url)
                const r = new MbtilesReader(u.pathname)
                const tilejson = await r.getTileJson()
                if (tilejson) {
                    if (tilejson.name) {
                        name = tilejson.name
                    }
                    const sourceLayers = tilejson.vector_layers.map(({ id }) => ({ id, name: id })) ?? []
                    thunkAPI.dispatch(actions.addSource({
                        id,
                        name,
                        type,
                        location: url,
                        sourceLayers,
                    }))
                }
                break
            }
            case SourceType.Raster: {
                const u = new URL(url)
                const r = new MbtilesReader(u.pathname)
                const tilejson = await r.getTileJson()
                if (tilejson) {
                    if (tilejson.name) {
                        name = tilejson.name
                    }
                    thunkAPI.dispatch(actions.addSource({
                        id,
                        name,
                        location: url,
                        type,
                    }))
                }
                break
            }
            case SourceType.Geojson: {
                // add pending source
                thunkAPI.dispatch(actions.addFeatureCollection({
                    id,
                    name,
                    location: url,
                }))

                const res = await get<GeoJSON.FeatureCollection>(url)
                if (res.ok) {
                    // add source later
                    thunkAPI.dispatch(actions.setData({
                        id,
                        dataset: res.data,

                        // todo: hardcode
                        meta: {
                            pointsCount: 0,
                            polygonsCount: 0,
                            linesCount: 0,
                        },
                    }))
                } else {
                    throw res.error
                }
                break
            }
            default: {
                break
            }
        }
    },
)

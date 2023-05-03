import { createAsyncThunk } from "@reduxjs/toolkit"
import { SourceType } from "@/types"
import { nextId } from "@/lib/nextId"
import { actions } from "."
import { init } from "@/lib/array"
import { get } from "@/lib/http"

const AT = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

export function getStem(pathname: string): string | null {
    const parts = pathname.split("/")
    if (parts.length === 0) {
        return null
    }

    const file = parts[parts.length - 1]
    const fileParts = file.split(".")
    if (fileParts.length === 1) {
        return fileParts[0]
    }
    return init(fileParts).join(".")
}

function mapboxToHttp(value: string, accessToken: string): string | null {
    const p = /mapbox:\/\/(.*)/
    const m = p.exec(value)
    if (!m) {
        return null
    }
    const name = m[1]

    return `https://api.mapbox.com/v4/${name}.json?secure&access_token=${accessToken}`
}

export async function extract(location: string, accessToken: string) {
    const url = new URL(location)

    let u = location
    switch (url.protocol) {
        case "mapbox:": {
            u = mapboxToHttp(location, accessToken) ?? location
            break
        }
        default: {
            break
        }
    }

    const res = await get<any>(u)
    if (!res.ok) {
        return null
    }

    const json = res.data
    const name = json.name
    if (!json.vector_layers) {
        const layers = [
            {
                id: name,
                name: name,
            },
        ]
        return {
            id: json.id,
            name,
            layers,
        }
    }
    return {
        id: json.id,
        name,
        layers: json.vector_layers.map((layer: any) => ({
            id: layer.id,
            name: layer.name,
        })),
    }
}

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

        if (type === SourceType.MVT) {
            const e = await extract(url, AT)
            name = e?.name ?? x.href

            thunkAPI.dispatch(actions.addVector({
                id,
                location: url,
                name,
                sourceLayers: e?.layers,
            }))
        } else {
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
        }

        return
    },
)

import { createAsyncThunk } from '@reduxjs/toolkit'
import { SourceType } from '@/types';
import { nextId } from '@/lib/nextId';
import { actions } from '.';

const AT = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

export async function extract(location: string, accessToken: string) {
    const p = /mapbox:\/\/(.*)/
    const m = p.exec(location)
    if (!m) {
        return null
    }
    const name = m[1]

    const res = await fetch(`https://api.mapbox.com/v4/${name}.json?secure&access_token=${accessToken}`)
    const json = await res.json()

    return {
        id: json.id,
        name: json.name,
        layers: json.vector_layers.map(({ id, name }) => ({
            id,
            name,
        }))
    }
}

export const addFromUrl = createAsyncThunk(
    'source/addFromFile',
    async ({ url, type }: { url: string, type: SourceType.Geojson | SourceType.MVT | SourceType.Raster }, thunkAPI) => {
        const x = new URL(url)
        // const path = x.pathname
        // const name = await basename(path)
        let name = x.href

        let id = nextId("source")
        // const { location, type } = action.payload
        if (type === SourceType.MVT) {
            const e = await extract(url, AT)
            name = e?.name ?? x.href
            // id = e?.id

            thunkAPI.dispatch(actions.addVector({
                id,
                location: url,
                name,
                sourceLayers: e?.layers,
            }))
        } else {
            thunkAPI.dispatch(actions.addRemote({
                id,
                type,
                location: url,
                name,
            }))
        }

        return
    },
)

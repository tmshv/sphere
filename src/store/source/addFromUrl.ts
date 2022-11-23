import { createAsyncThunk } from '@reduxjs/toolkit'
import { SourceType } from '@/types';
import { nextId } from '@/lib/nextId';
import { actions } from '.';
import { init } from '@/lib/array';

const AT = "pk.eyJ1IjoidG1zaHYiLCJhIjoiZjYzYmViZjllN2MxNGU1OTAxZThkMWM5MTRlZGM4YTYifQ.uvMlwjz7hyyY7c54Hs47SQ"

export function getStem(pathname: string): string | null {
    const parts = pathname.split('/')
    if (parts.length === 0) {
        return null
    }

    const file = parts[parts.length - 1]
    return init(file.split('.')).join('.')
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
    console.log(url)

    let u = location
    switch (url.protocol) {
        case 'mapbox:': {
            u = mapboxToHttp(location, accessToken) ?? location
            break
        }
        default: {
            break
        }
    }

    const res = await fetch(u)
    const json = await res.json()

    const name = json.name
    if (!json.vector_layers) {
        const layers = [
            {
                id: name,
                name: name,
            }
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
        layers: json.vector_layers.map((layer: any)=> ({
            id: layer.id,
            name: layer.name,
        }))
    }
}

export const addFromUrl = createAsyncThunk(
    'source/addFromUrl',
    async ({ url, type }: { url: string, type: SourceType.Geojson | SourceType.MVT | SourceType.Raster }, thunkAPI) => {
        const x = new URL(url)
        const stem = getStem(x.pathname)
        let name = stem ?? x.pathname

        let id = nextId("source")
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

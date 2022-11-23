import { createAsyncThunk, createAction } from '@reduxjs/toolkit'
import { readTextFile } from "@tauri-apps/api/fs"
import { basename, extname } from '@tauri-apps/api/path';
import { parseGeojson } from '../../lib/parseGeojson'
import { parseGpx } from '../../lib/parseGpx'
import { parseCsv } from '@/lib/parseCsv';
import { FileParser } from '@/types';
import { nextId } from '@/lib/nextId';

const parsers = new Map<string, FileParser>([
    ["json", parseGeojson],
    ["geojson", parseGeojson],
    ["gpx", parseGpx],
    ["csv", parseCsv],
])

export const addFromFiles = createAction<string[]>('source/readFromFiles')
export const addFromFile = createAsyncThunk('source/addFromFile', async (path: string, thunkAPI) => {
    const name = await basename(path)
    const ext = await extname(path)
    if (!parsers.has(ext)) {
        console.log("Cannot find parser")
        return null
    }
    const parser = parsers.get(ext)!

    const raw = await readTextFile(path)
    const [dataset, meta] = await parser(raw)

    return {
        id: nextId("source"),
        location: path,
        name,
        dataset,
        meta,
    }
})

export const addFromUrl = createAsyncThunk('source/addFromFile', async (url: string, thunkAPI) => {
    const x = new URL(url)
    const path = x.pathname
    const name = await basename(path)

    // if geojson -> add it as is
    // thunkAPI.dispatch(actions.source.addSource({
    //     id: nextId('source-url'),
    //     name,
    //     location: url,
    //     dataset: {
    //         id: '1',
    //         type: SourceType.Geojson,
    //         data: []
    //     },
    // }))

    // if it other -> load it and parse
    const res = await fetch(url)
    const raw = await res.text()

    const ext = await extname(path)
    if (!ext) {
        throw new Error(`Cannot read file extension`)
    }

    if (!parsers.has(ext)) {
        throw new Error(`File "${ext}" is not supported`)
    }
    const parser = parsers.get(ext)!

    // const dataset = await parser(name, url, raw)
    const [dataset, meta] = await parser(raw)
    // if (!dataset) {
    //     throw new Error("Failed to read file")
    // }

    return {
        if: nextId("source"),
        location: url,
        name,
        dataset,
        meta,
    }
})

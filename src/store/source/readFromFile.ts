import { createAsyncThunk, createAction } from '@reduxjs/toolkit'
import { readTextFile } from "@tauri-apps/api/fs"
import { basename, extname } from '@tauri-apps/api/path';
import { parseGeojson } from '../../lib/parseGeojson'
import { parseGpx } from '../../lib/parseGpx'
import { parseCsv } from '@/lib/parseCsv';

const parsers = new Map([
    ["json", parseGeojson],
    ["geojson", parseGeojson],
    ["gpx", parseGpx],
    ["csv", parseCsv],
])

export const addFromFiles = createAction<string[]>('source/readFromFiles')
export const readFromFile = createAsyncThunk('source/readFromFile', async (path: string, thunkAPI) => {
    const name = await basename(path)
    const ext = await extname(path)
    if (!parsers.has(ext)) {
        console.log("Cannot find parser")
        return null
    }
    const parser = parsers.get(ext)!

    const raw = await readTextFile(path)
    const datasets = await parser(name, path, raw)
    if (!datasets) {
        console.log("Failed to read")
        return null
    }

    return datasets
})

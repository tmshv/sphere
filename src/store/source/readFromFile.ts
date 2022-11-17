import { createAsyncThunk } from '@reduxjs/toolkit'
import { readTextFile } from "@tauri-apps/api/fs"
import { parseGeojson } from '../../lib/parseGeojson'
import { parseGpx } from '../../lib/parseGpx'
import * as turf from "@turf/helpers"
import { SourceType } from '../../types'

const pointType = new Set(["Point", "MultiPoint"])
const lineType = new Set(["LineString", "MultiLineStreing"])
const polygonType = new Set(["Polygon", "MultiPolygon"])

const parsers = new Map([
    ["json", parseGeojson],
    ["geojson", parseGeojson],
    ["gpx", parseGpx],
])

function getExt(path: string): string {
    const x = path.split(".")
    return x[x.length - 1]
}

type SourceTuple = [SourceType, GeoJSON.FeatureCollection]

export const readFromFile = createAsyncThunk('source/readFromFile', async (path: string, thunkAPI) => {
    const ext = getExt(path)
    if (!parsers.has(ext)) {
        console.log("Cannot find parser")
        return null
    }
    const parser = parsers.get(ext)!

    const raw = await readTextFile(path)
    const data = await parser(raw)
    if (!data) {
        console.log("Failed to read")
        return null
    }

    const points = data.features.filter(f => pointType.has(f.geometry.type))
    const lines = data.features.filter(f => lineType.has(f.geometry.type))
    const polygons = data.features.filter(f => polygonType.has(f.geometry.type))

    return [
        [SourceType.Points, turf.featureCollection(points) as GeoJSON.FeatureCollection] as SourceTuple,
        [SourceType.Lines, turf.featureCollection(lines) as GeoJSON.FeatureCollection] as SourceTuple,
        [SourceType.Polygons, turf.featureCollection(polygons) as GeoJSON.FeatureCollection] as SourceTuple,
    ]
})

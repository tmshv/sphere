import { createAsyncThunk } from "@reduxjs/toolkit"
import { readText } from "@tauri-apps/plugin-clipboard-manager"
import { actions } from "."
import logger from "@/logger"

const GEOJSON_TYPES = new Set([
    "FeatureCollection",
    "Feature",
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection",
])

function toFeatureCollection(data: any): GeoJSON.FeatureCollection | null {
    if (data.type === "FeatureCollection") {
        return data as GeoJSON.FeatureCollection
    }
    if (data.type === "Feature") {
        return {
            type: "FeatureCollection",
            features: [data as GeoJSON.Feature],
        }
    }
    // Geometry type
    return {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: data as GeoJSON.Geometry,
            properties: {},
        }],
    }
}

function deriveSchema(fc: GeoJSON.FeatureCollection): Record<string, string> {
    const schema: Record<string, string> = {}
    for (const feature of fc.features) {
        if (!feature.properties) {
            continue
        }
        for (const [key, value] of Object.entries(feature.properties)) {
            if (!(key in schema)) {
                schema[key] = typeof value
            }
        }
    }
    return schema
}

const action = createAsyncThunk(
    "source/addFromClipboard",
    async (_, thunkAPI) => {
        try {
            const text = await readText()
            if (!text) {
                return
            }

            let data: any
            try {
                data = JSON.parse(text)
            } catch {
                logger.warn("Clipboard content is not valid JSON")
                return
            }

            if (!data || typeof data !== "object" || !GEOJSON_TYPES.has(data.type)) {
                logger.warn("Clipboard content is not valid GeoJSON")
                return
            }

            const dataset = toFeatureCollection(data)
            if (!dataset) {
                return
            }

            const id = crypto.randomUUID()
            const metadata = deriveSchema(dataset)

            thunkAPI.dispatch(actions.addGeojsonSource({
                id,
                name: "Pasted GeoJSON",
                location: "",
                metadata,
                meta: { pointsCount: 0, linesCount: 0, polygonsCount: 0 },
                dataset,
            }))
        } catch (error) {
            logger.error("Failed to paste GeoJSON from clipboard: %s", error)
        }
    },
)

export default action

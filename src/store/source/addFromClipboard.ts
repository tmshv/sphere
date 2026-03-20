import logger from "@/logger"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { readText } from "@tauri-apps/plugin-clipboard-manager"
import { actions } from "."

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

function expandFeature(feature: GeoJSON.Feature): GeoJSON.Feature[] {
    if (feature.geometry?.type === "GeometryCollection") {
        const gc = feature.geometry as GeoJSON.GeometryCollection
        return gc.geometries.map(geometry => ({
            type: "Feature" as const,
            geometry,
            properties: { ...feature.properties },
        }))
    }
    return [feature]
}

function toFeatureCollection(data: any): GeoJSON.FeatureCollection | null {
    if (data.type === "FeatureCollection") {
        const fc = data as GeoJSON.FeatureCollection
        return {
            type: "FeatureCollection",
            features: fc.features.flatMap(expandFeature),
        }
    }
    if (data.type === "Feature") {
        return {
            type: "FeatureCollection",
            features: expandFeature(data as GeoJSON.Feature),
        }
    }
    if (data.type === "GeometryCollection") {
        const gc = data as GeoJSON.GeometryCollection
        return {
            type: "FeatureCollection",
            features: gc.geometries.map(geometry => ({
                type: "Feature" as const,
                geometry,
                properties: {},
            })),
        }
    }
    // Simple geometry type
    return {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: data as GeoJSON.Geometry,
                properties: {},
            },
        ],
    }
}

const action = createAsyncThunk("source/addFromClipboard", async (_, thunkAPI) => {
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
        thunkAPI.dispatch(
            actions.addFeatureCollection({
                id,
                name: "Pasted GeoJSON",
                dataset,
            }),
        )
    } catch (error) {
        logger.error("Failed to paste GeoJSON from clipboard: %s", error)
    }
})

export default action

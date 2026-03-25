import logger from "@/logger"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { invoke } from "@tauri-apps/api/core"
import { readText } from "@tauri-apps/plugin-clipboard-manager"
import { actions, computeGeometryMeta } from "."

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

        const result = await invoke<{ id: string; name: string; location: string }>("source_add_data", {
            name: "Pasted GeoJSON",
            data: JSON.stringify(dataset),
        })
        const meta = computeGeometryMeta(dataset)
        thunkAPI.dispatch(
            actions.addInMemorySource({ id: result.id, name: result.name, location: result.location, meta }),
        )
    } catch (error) {
        logger.error("Failed to paste GeoJSON from clipboard: %s", error)
    }
})

export default action

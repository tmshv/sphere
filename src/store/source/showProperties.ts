import { WebviewWindow } from "@tauri-apps/api/window"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { Id, SourceType } from "@/types"
import { emit } from "@tauri-apps/api/event"
import { RootState } from ".."
import { waitEvent } from "@/lib/tauri"
import { Source } from "."
import { ShapeReader } from "@/lib/shape"
import logger from "@/logger"

async function getProps(source: Source): Promise<GeoJSON.GeoJsonProperties[] | null> {
    switch (source.type) {
        case SourceType.FeatureCollection: {
            return source.dataset!.features.map(f => f.properties)
        }
        case SourceType.Geojson: {
            const url = new URL(source.location)
            const r = new ShapeReader(url.pathname)
            const geojson = await r.getGeojson()
            if (!geojson) {
                return null
            }
            return geojson.features.map(f => f.properties)
        }
        default: {
            return null
        }
    }
}

export const showProperties = createAsyncThunk(
    "source/showProperties",
    async ({ id }: { id: Id }, thunkAPI) => {
        const state = thunkAPI.getState() as RootState
        const source = state.source.items[id]
        if (!source) {
            throw new Error("Source is not found")
        }

        const properties = await getProps(source)
        if (!properties) {
            logger.error(`No properties for source ${source.name}`)
            throw new Error(`Property table is not available for "${source.name}"`)
        }

        const w = "sphere-properties"
        const window = new WebviewWindow(w, {
            url: "properties.html",
        })
        // since the webview window is created asynchronously,
        // Tauri emits the `tauri://created` and `tauri://error` to notify you of the creation response
        window.once("tauri://created", function() {
            // webview window successfully created
        })
        window.once("tauri://error", function(e) {
            // an error occurred during webview window creation
        })

        const status = await waitEvent("properties-init")
        logger.info("Got properties-init", status)

        emit("properties-set", { properties })
    },
)

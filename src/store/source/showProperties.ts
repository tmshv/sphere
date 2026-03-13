import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { Id, SourceType } from "@/types"
import { emit } from "@tauri-apps/api/event"
import type { RootState } from ".."
import { waitEvent } from "@/lib/tauri"
import type { Source } from "@/types/source"
import { SourceReader } from "@/lib/source-reader"
import logger from "@/logger"

async function getProps(source: Source): Promise<GeoJSON.GeoJsonProperties[] | null> {
    switch (source.type) {
        case SourceType.FeatureCollection: {
            return source.dataset!.features.map(f => f.properties)
        }
        case SourceType.Geojson: {
            const r = new SourceReader(source.location)
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

        const existing = await WebviewWindow.getByLabel("sphere-properties")
        if (existing) {
            await existing.setFocus()
        } else {
            const window = new WebviewWindow("sphere-properties", {
                url: "properties.html",
            })
            // since the webview window is created asynchronously,
            // Tauri emits the `tauri://created` and `tauri://error` to notify you of the creation response
            window.once("tauri://created", function() {
                // webview window successfully created
            })
            window.once("tauri://error", function(e) {
                logger.error({ error: e }, "Failed to create properties window")
                throw new Error("Failed to open properties window")
            })
        }

        const status = await waitEvent("properties-init")
        logger.info({ status }, "Got properties-init")

        emit("properties-set", { properties })
    },
)

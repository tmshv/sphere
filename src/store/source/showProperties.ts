import { WebviewWindow } from "@tauri-apps/api/window"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { Id, SourceType } from "@/types"
import { emit } from "@tauri-apps/api/event"
import { RootState } from ".."
import { waitEvent } from "@/lib/tauri"

export const showProperties = createAsyncThunk(
    "source/showProperties",
    async ({ id }: { id: Id }, thunkAPI) => {
        const state = thunkAPI.getState() as RootState
        const source = state.source.items[id]
        if (!source) {
            throw new Error("Source is not found")
        }

        if (!(!source.pending && source.type === SourceType.FeatureCollection)) {
            throw new Error(`Property table is not available for "${source.name}"`)
        }

        const properties = source.dataset.features.map(f => f.properties)

        const w = "sphere-properties"
        const window = new WebviewWindow(w, {
            url: "properties.html",
        })
        // since the webview window is created asynchronously,
        // Tauri emits the `tauri://created` and `tauri://error` to notify you of the creation response
        window.once("tauri://created", function() {
            console.log("window created")
            // webview window successfully created
        })
        window.once("tauri://error", function(e) {
            console.log("window error", e)
            // an error occurred during webview window creation
        })

        const status = await waitEvent("properties-init")

        emit("properties-set", { properties })
        console.log("fired!", status)
    },
)

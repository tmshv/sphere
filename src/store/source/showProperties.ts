import { waitEvent } from "@/lib/tauri"
import logger from "@/logger"
import { type Id, SourceType } from "@/types"
import { createAsyncThunk } from "@reduxjs/toolkit"
import { emit } from "@tauri-apps/api/event"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import type { RootState } from ".."

export const showProperties = createAsyncThunk(
    "source/showProperties",
    async ({ id, filterExpression }: { id: Id; filterExpression?: unknown[] }, thunkAPI) => {
        const state = thunkAPI.getState() as RootState
        const source = state.source.items[id]
        if (!source) {
            throw new Error("Source is not found")
        }

        if ((source.type !== SourceType.Geojson && source.type !== SourceType.FeatureCollection) || source.pending) {
            logger.error(`Properties table is not available for source type "${source.type}"`)
            throw new Error(`Property table is not available for "${source.name}"`)
        }

        const existing = await WebviewWindow.getByLabel("sphere-properties")
        if (existing) {
            await existing.setFocus()
        } else {
            const window = new WebviewWindow("sphere-properties", {
                url: "properties.html",
                title: "Properties",
            })
            window.once("tauri://created", () => {
                // webview window successfully created
            })
            window.once("tauri://error", e => {
                logger.error({ error: e }, "Failed to create properties window")
                throw new Error("Failed to open properties window")
            })
        }

        const status = await waitEvent("properties-init")
        logger.info({ status }, "Got properties-init")

        await emit("properties-set", {
            sourceId: id,
            schema: source.meta,
            filterExpression: filterExpression ?? null,
        })

        const freshState = thunkAPI.getState() as RootState
        const selectionSourceId = freshState.selection.sourceId ?? freshState.source.selectedId ?? undefined
        const count = freshState.selection.count
        if (count > 0 && selectionSourceId === id) {
            await emit("properties-selection-changed", {
                sourceId: selectionSourceId,
                count,
            })
        }
    },
)

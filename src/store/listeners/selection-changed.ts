import { actions } from "@/store"
import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { invoke } from "@tauri-apps/api/core"
import { emit } from "@tauri-apps/api/event"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"

const listener = createListenerMiddleware()

// Notify properties table window on any selection change
const notifyPropertiesWindow = async (sourceId: string | undefined, selectedIds: number[]) => {
    if (!sourceId) {
        return
    }
    const win = await WebviewWindow.getByLabel("sphere-properties")
    if (!win) {
        return
    }
    await emit("properties-selection-changed", { sourceId, selectedIds })
}

// On selectMany: populate PropertiesPopup + notify table window
listener.startListening({
    actionCreator: actions.selection.selectMany,
    effect: async (action, listenerApi) => {
        const { sourceId, featureIds } = action.payload
        const dispatch = listenerApi.dispatch

        // Notify table window
        await notifyPropertiesWindow(sourceId, featureIds)

        if (featureIds.length === 0) {
            dispatch(actions.properties.reset())
            return
        }

        // Fetch properties for PropertiesPopup using source_query_page with ID filter
        try {
            const filterJson = JSON.stringify(["in", ["id"], ["literal", featureIds]])
            const result = await invoke<{ features: Record<string, unknown>[] }>("source_query_page", {
                id: sourceId,
                offset: 0,
                limit: featureIds.length,
                filterJson,
            })
            const values = result.features.map(({ id: _, ...props }) => props)
            dispatch(actions.properties.set({ values }))
        } catch {
            dispatch(actions.properties.reset())
        }
    },
})

// On selectOne: notify table window (single feature)
listener.startListening({
    actionCreator: actions.selection.selectOne,
    effect: async (action, listenerApi) => {
        const state = listenerApi.getState() as RootState
        const layerId = action.payload.layerId
        const sourceId = state.layer.items[layerId]?.sourceId
        await notifyPropertiesWindow(sourceId, [action.payload.featureId])
    },
})

export default listener

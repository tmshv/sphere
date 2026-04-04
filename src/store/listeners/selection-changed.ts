import { createListenerMiddleware } from "@reduxjs/toolkit"
import type { RootState } from ".."
import { actions } from "../actions"
import { selectionQueryPage } from "@/lib/selection-ipc"
import { emit } from "@tauri-apps/api/event"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"

const listener = createListenerMiddleware()

const PROPERTIES_PAGE_LIMIT = 100

const notifyPropertiesWindow = async (sourceId: string | undefined, count: number) => {
    if (!sourceId) return
    const win = await WebviewWindow.getByLabel("sphere-properties")
    if (!win) return
    await emit("properties-selection-changed", { sourceId, count })
}

listener.startListening({
    actionCreator: actions.selection.apply,
    effect: async (_, listenerApi) => {
        const state = listenerApi.getState() as RootState
        const count = state.selection.count
        const sourceId =
            state.selection.sourceId ??
            state.source.selectedId ??
            (state.layer.selectedId ? state.layer.items[state.layer.selectedId]?.sourceId : undefined)

        if (state.selection.sourceId !== sourceId) {
            listenerApi.dispatch(actions.selection.setSourceId(sourceId))
        }

        await notifyPropertiesWindow(sourceId, count)

        if (count === 0 || !sourceId) {
            listenerApi.dispatch(actions.properties.reset())
            return
        }

        try {
            const result = await selectionQueryPage(sourceId, 0, PROPERTIES_PAGE_LIMIT)
            const values = result.features.map(f => f.properties ?? {})
            listenerApi.dispatch(actions.properties.set({ values }))
        } catch {
            listenerApi.dispatch(actions.properties.reset())
        }
    },
})

export default listener
